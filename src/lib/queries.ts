import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  GOAL_CATEGORY_ALIASES,
  AUDIENCE_CATEGORY_ALIASES,
  AXIS_DUPLICATE_CATEGORY_SLUGS,
} from "@/lib/taxonomy";

/* ─────────── Data Cache ───────────
 * Горячие публичные чтения кэшируются между запросами через unstable_cache
 * и сбрасываются по тегам из админских actions:
 *   - "catalog"  — категории и товары;
 *   - "reviews"  — одобренные отзывы и агрегаты рейтингов;
 *   - "content"  — баннеры и материалы.
 * Ключ кэша автоматически включает аргументы функции. Внутри кэшируемых
 * функций нет cookies()/headers()/сессий — только запросы к БД.
 * Поиск (см. src/lib/search.ts и getProducts с opts.search) не кэшируется.
 */

/**
 * unstable_cache сериализует результат в JSON, поэтому на попадании в кэш
 * поля Date приходят строками. Восстанавливаем их in-place: объект — свежий
 * результат JSON.parse (новый на каждое чтение), мутация безопасна; на промахе
 * значения уже Date и проверка typeof не срабатывает.
 */
const DATE_KEYS = new Set(["createdAt", "updatedAt", "publishedAt", "startsAt", "endsAt"]);

function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) reviveDates(item);
  } else if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (typeof v === "string" && DATE_KEYS.has(key)) obj[key] = new Date(v);
      else reviveDates(v);
    }
  }
  return value;
}

/* ─────────── Категории ─────────── */

const getCachedNavCategories = unstable_cache(
  () =>
    prisma.category.findMany({
      // Дубли осей («Иммунитет», «Для женщин»…) не показываем в меню и плитках —
      // их роль выполняют чипсы «Зачем»/«Кому» (страницы категорий остаются).
      where: { isActive: true, parentId: null, slug: { notIn: AXIS_DUPLICATE_CATEGORY_SLUGS } },
      orderBy: { sortOrder: "asc" },
    }),
  ["nav-categories"],
  { tags: ["catalog"], revalidate: 300 },
);

export const getNavCategories = cache(async () => {
  // Устойчивость к недоступной БД (как у getSettings): на этапе сборки
  // Next пререндерит loading-шеллы вместе с layout — БД там может не быть.
  try {
    return reviveDates(await getCachedNavCategories());
  } catch {
    return [];
  }
});

const getCachedCategoryBySlug = unstable_cache(
  (slug: string) => prisma.category.findUnique({ where: { slug } }),
  ["category-by-slug"],
  { tags: ["catalog"], revalidate: 120 },
);

export const getCategoryBySlug = cache(async (slug: string) =>
  reviveDates(await getCachedCategoryBySlug(slug)),
);

/* ─────────── Рейтинги товаров (одобренные отзывы) ─────────── */

export interface ReviewStats {
  avg: number; // средний рейтинг, округлён до 0.1
  count: number; // число одобренных отзывов
}

/**
 * Агрегация отзывов по списку товаров одним запросом (groupBy, без N+1).
 * Возвращает Map productId → { avg, count } только для товаров с отзывами.
 * Не кэшируется напрямую (Map не переживает JSON-сериализацию Data Cache);
 * вызывается внутри уже кэшированных getProducts/getRelatedProducts.
 */
export async function getReviewStatsMap(productIds: string[]): Promise<Map<string, ReviewStats>> {
  if (productIds.length === 0) return new Map();
  const grouped = await prisma.productReview.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    grouped.map((g) => [
      g.productId,
      { avg: Math.round((g._avg.rating ?? 0) * 10) / 10, count: g._count._all },
    ]),
  );
}

/** Дополняет товары полем reviewStats (avg/count по одобренным отзывам). */
async function withReviewStats<T extends { id: string }>(
  items: T[],
): Promise<(T & { reviewStats?: ReviewStats | null })[]> {
  const stats = await getReviewStatsMap(items.map((i) => i.id));
  return items.map((item) => ({ ...item, reviewStats: stats.get(item.id) ?? null }));
}

/* ─────────── Товары ─────────── */

interface ProductsOpts {
  categorySlug?: string;
  audience?: string;
  goal?: string;
  featured?: boolean;
  onSale?: boolean;
  take?: number;
  skip?: number;
  search?: string;
}


/** Условия по осям «кому»/«зачем»: тег ИЛИ принадлежность категории-дублю
 *  (в БД часть категорий повторяет оси — «Иммунитет», «Для женщин» и т.п.). */
function axisConditions(opts: { audience?: string; goal?: string }) {
  const and: object[] = [];
  if (opts.audience) {
    const alias = AUDIENCE_CATEGORY_ALIASES[opts.audience];
    and.push({
      OR: [
        { audiences: { has: opts.audience } },
        ...(alias ? [{ category: { slug: alias } }] : []),
      ],
    });
  }
  if (opts.goal) {
    const alias = GOAL_CATEGORY_ALIASES[opts.goal];
    and.push({
      OR: [
        { goals: { has: opts.goal } },
        ...(alias ? [{ category: { slug: alias } }] : []),
      ],
    });
  }
  return and;
}

async function loadProducts(opts: ProductsOpts) {
  const where = {
    isActive: true,
    ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
    AND: axisConditions(opts),
    ...(opts.featured ? { isFeatured: true } : {}),
    ...(opts.onSale ? { oldPriceKopecks: { not: null } } : {}),
    ...(opts.search
      ? { name: { contains: opts.search, mode: "insensitive" as const } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      take: opts.take,
      skip: opts.skip,
    }),
    prisma.product.count({ where }),
  ]);
  return { items: await withReviewStats(items), total };
}

// Результат включает reviewStats → инвалидируется и по "catalog", и по "reviews".
const getCachedProducts = unstable_cache(loadProducts, ["products-list"], {
  tags: ["catalog", "reviews"],
  revalidate: 120,
});

export async function getProducts(opts: ProductsOpts) {
  // Произвольные поисковые строки не кэшируем: каждый пользовательский запрос
  // создавал бы отдельную запись в Data Cache (см. также search.ts).
  if (opts.search) return loadProducts(opts);
  return reviveDates(await getCachedProducts(opts));
}

const getCachedProductBySlug = unstable_cache(
  (slug: string) =>
    prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
      },
    }),
  ["product-by-slug"],
  { tags: ["catalog"], revalidate: 120 },
);

export const getProductBySlug = cache(async (slug: string) =>
  reviveDates(await getCachedProductBySlug(slug)),
);

const getCachedRelatedProducts = unstable_cache(
  async (categoryId: string, excludeId: string, take: number) => {
    const items = await prisma.product.findMany({
      where: { categoryId, isActive: true, id: { not: excludeId } },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
      take,
    });
    return withReviewStats(items);
  },
  ["related-products"],
  { tags: ["catalog", "reviews"], revalidate: 120 },
);

export async function getRelatedProducts(categoryId: string, excludeId: string, take = 8) {
  return reviveDates(await getCachedRelatedProducts(categoryId, excludeId, take));
}

/* ─────────── Отзывы ─────────── */

const getCachedApprovedReviews = unstable_cache(
  (productId: string) =>
    prisma.productReview.findMany({
      where: { productId, isApproved: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, authorName: true, rating: true, content: true, createdAt: true },
    }),
  ["approved-reviews"],
  { tags: ["reviews"], revalidate: 300 },
);

/** Одобренные отзывы товара (новые сверху). */
export const getApprovedReviews = cache(async (productId: string) =>
  reviveDates(await getCachedApprovedReviews(productId)),
);

/* ─────────── Баннеры и материалы ─────────── */

const getCachedBanners = unstable_cache(
  (placement: "HERO" | "HOME_STRIP" | "CATEGORY" | "SIDEBAR" | "POPUP") => {
    // Date.now — не request-API, внутри unstable_cache допустим; окно показа
    // проверяется на момент заполнения кэша (погрешность ≤ TTL).
    const now = new Date();
    return prisma.banner.findMany({
      where: {
        placement,
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: "asc" },
    });
  },
  ["banners"],
  { tags: ["content"], revalidate: 120 },
);

export async function getBanners(
  placement: "HERO" | "HOME_STRIP" | "CATEGORY" | "SIDEBAR" | "POPUP",
) {
  return reviveDates(await getCachedBanners(placement));
}

const getCachedPublishedMaterials = unstable_cache(
  (take?: number) =>
    prisma.material.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take,
    }),
  ["published-materials"],
  { tags: ["content"], revalidate: 300 },
);

export async function getPublishedMaterials(take?: number) {
  return reviveDates(await getCachedPublishedMaterials(take));
}

const getCachedMaterialBySlug = unstable_cache(
  (slug: string) => prisma.material.findUnique({ where: { slug } }),
  ["material-by-slug"],
  { tags: ["content"], revalidate: 300 },
);

export const getMaterialBySlug = cache(async (slug: string) =>
  reviveDates(await getCachedMaterialBySlug(slug)),
);

export type ProductCardData = Awaited<ReturnType<typeof getProducts>>["items"][number];

/* ─────────── Каталог: категории со счётчиками (мобильный хаб) ─────────── */

const getCachedCategoriesWithCounts = unstable_cache(
  () =>
    prisma.category.findMany({
      // Без категорий-дублей осей: они представлены чипсами «Зачем»/«Кому» выше.
      where: { isActive: true, parentId: null, slug: { notIn: AXIS_DUPLICATE_CATEGORY_SLUGS } },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    }),
  ["categories-with-counts"],
  { tags: ["catalog"], revalidate: 300 },
);

/** Активные корневые категории + число активных товаров в каждой (плитки хаба каталога). */
export const getCategoriesWithCounts = cache(async () =>
  reviveDates(await getCachedCategoriesWithCounts()),
);

export type CategoryWithCount = Awaited<ReturnType<typeof getCategoriesWithCounts>>[number];

/* ─────────── Сортировка списков товаров (?sort= на страницах подборок) ─────────── */

export type ProductSort = "popular" | "price-asc" | "price-desc" | "new";

/** Валидация значения ?sort= из URL; всё неизвестное — «по популярности». */
export function parseProductSort(value: string | string[] | undefined): ProductSort {
  return value === "price-asc" || value === "price-desc" || value === "new" ? value : "popular";
}

const getCachedSortedProducts = unstable_cache(
  async (opts: Omit<ProductsOpts, "search">, sort: Exclude<ProductSort, "popular">) => {
    // where повторяет loadProducts (кроме search): функция добавлена отдельно,
    // чтобы не менять сигнатуру и ключи кэша существующего getProducts.
    const where = {
      isActive: true,
      ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
      AND: axisConditions(opts),
      ...(opts.featured ? { isFeatured: true } : {}),
      ...(opts.onSale ? { oldPriceKopecks: { not: null } } : {}),
    };
    const orderBy =
      sort === "price-asc"
        ? { priceKopecks: "asc" as const }
        : sort === "price-desc"
          ? { priceKopecks: "desc" as const }
          : { createdAt: "desc" as const };
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
        orderBy,
        take: opts.take,
        skip: opts.skip,
      }),
      prisma.product.count({ where }),
    ]);
    return { items: await withReviewStats(items), total };
  },
  ["products-list-sorted"],
  { tags: ["catalog", "reviews"], revalidate: 120 },
);

/**
 * getProducts + сортировка. «popular» делегирует в getProducts (исходный
 * порядок: хиты выше), остальные варианты — отдельная кэшируемая выборка.
 */
export async function getSortedProducts(opts: Omit<ProductsOpts, "search">, sort: ProductSort) {
  if (sort === "popular") return getProducts(opts);
  return reviveDates(await getCachedSortedProducts(opts, sort));
}
