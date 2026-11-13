import { CATALOG_DIRECTIONS, findCatalogDirection } from "../../../../../shared/catalog-directions";
import { ListLink as Link } from "@/components/ui/list-link";
import { DirectionMark } from "@/components/site/direction-mark";
import type { Metadata } from "next";
import { ChipsRow } from "@/components/product/chips-row";
import { CatalogView, CATALOG_PAGE_SIZE, pageNumber, SORT_OPTIONS } from "@/components/product/catalog-view";
import { CatalogHub } from "@/components/site/catalog-hub";
import { getCategoriesWithCounts, getProducts, getPurchasedProducts, parseProductSort } from "@/lib/queries";
import { getFeaturedBrands } from "@/lib/brands";
import { getCustomerSession } from "@/lib/customer-auth";
import { audienceName, goalName } from "@/lib/taxonomy";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";

// Каталог фильтруется query-параметрами — всегда рендер на запрос
// (и без обращения к БД на этапе сборки).
export const dynamic = "force-dynamic";

type CatalogSearchParams = Partial<Record<"q" | "category" | "goal" | "audience" | "direction" | "sort" | "page", string | string[]>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  const q = first((await searchParams).q);
  const settings = await getSettings();
  return buildMetadata(
    {
      title: q ? `Поиск: ${q}` : "Каталог товаров",
      description: "Полный каталог натуральных витаминов и БАД компании ХАЯТ.",
      path: "/catalog",
    },
    settings,
  );
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const q = first(params.q);
  const category = first(params.category);
  const goal = first(params.goal);
  const audience = first(params.audience);
  const pageParam = first(params.page);
  const direction = findCatalogDirection(first(params.direction));
  const sort = parseProductSort(params.sort);
  const isFiltered = Boolean(q || category || goal || audience || direction || sort !== "popular" || pageParam);
  const page = pageNumber(pageParam);
  const skip = (page - 1) * CATALOG_PAGE_SIZE;
  /** Адрес N-й страницы с сохранением фильтров. */
  const href = (
    p: number,
    directionId: string | null | undefined = direction?.id,
    order = sort,
    categorySlug: string | null | undefined = category,
  ) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (categorySlug) qs.set("category", categorySlug);
    if (goal) qs.set("goal", goal);
    if (audience) qs.set("audience", audience);
    if (directionId) qs.set("direction", directionId);
    if (order !== "popular") qs.set("sort", order);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/catalog?${s}` : "/catalog";
  };

  const categories = await getCategoriesWithCounts();
  const { items, total } = await getProducts({
    search: q,
    categorySlug: category,
    goal,
    audience,
    direction: direction?.id,
    sort: sort === "price-asc" ? "price_asc" : sort === "price-desc" ? "price_desc" : sort,
    take: CATALOG_PAGE_SIZE,
    skip,
  });
  const categoryName = categories.find((item) => item.slug === category)?.name;
  const title = q
    ? `Поиск: «${q}»`
    : categoryName ||
      (goal ? goalName(goal) : undefined) ||
      (audience ? audienceName(audience) : undefined) ||
      "Каталог товаров";

  const session = isFiltered ? null : await getCustomerSession();
  const hub = isFiltered ? null : await Promise.all([
    session ? getPurchasedProducts(session.sub, 10) : [],
    getProducts({ featured: true, take: 10 }),
    getFeaturedBrands(),
  ]);

  return (
    <>
      <CatalogView
        title={title}
        products={items}
        total={total}
        categoryHref={(slug) => href(1, direction?.id, sort, slug ?? null)}
        filters={(
          <>
            <ChipsRow label="Фильтр по направлению" activeKey={direction?.id} className="catalog-filter-row mb-5 snap-none flex-wrap items-center overflow-visible">
              <Link href={href(1, null)} aria-current={!direction ? "true" : undefined} data-active={!direction ? "true" : undefined} className="catalog-chip">Все направления</Link>
              {CATALOG_DIRECTIONS.map((item) => (
                <Link key={item.id} href={href(1, item.id)} aria-current={direction?.id === item.id ? "true" : undefined} data-active={direction?.id === item.id ? "true" : undefined} className="catalog-chip">
                  <DirectionMark direction={item} dark={direction?.id === item.id} />
                </Link>
              ))}
            </ChipsRow>
            <ChipsRow label="Сортировка" activeKey={sort} className="catalog-filter-row mb-5 snap-none flex-wrap overflow-visible">
              {SORT_OPTIONS.map((item) => (
                <Link key={item.value} href={href(1, direction?.id, item.value)} aria-current={sort === item.value ? "true" : undefined} data-active={sort === item.value ? "true" : undefined} className="catalog-chip">{item.label}</Link>
              ))}
            </ChipsRow>
          </>
        )}
        categories={categories}
        activeSlug={categoryName ? category : undefined}
        page={page}
        pageQuery={(page) => href(page)}
      />
      {hub ? (
        <details className="mt-8 rounded-[var(--r-lg)] bg-white p-4 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Подборки, категории и бренды</summary>
          <CatalogHub purchased={hub[0]} categories={categories} hits={hub[1].items} featuredBrands={hub[2]} />
        </details>
      ) : null}
    </>
  );
}
