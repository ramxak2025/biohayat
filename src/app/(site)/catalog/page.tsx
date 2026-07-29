import type { Metadata } from "next";
import { CatalogView, CATALOG_PAGE_SIZE, pageNumber } from "@/components/product/catalog-view";
import { CatalogHub } from "@/components/site/catalog-hub";
import { GoalCollections } from "@/components/site/goal-collections";
import { getCategoriesWithCounts, getProducts, getPurchasedProducts } from "@/lib/queries";
import { getActiveBrands, getFeaturedBrands } from "@/lib/brands";
import { getCustomerSession } from "@/lib/customer-auth";
import { audienceName, goalName } from "@/lib/taxonomy";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";

// Каталог фильтруется query-параметрами — всегда рендер на запрос
// (и без обращения к БД на этапе сборки).
export const dynamic = "force-dynamic";

interface CatalogSearchParams {
  page?: string;
  q?: string;
  category?: string;
  goal?: string;
  audience?: string;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  const { q } = await searchParams;
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
  const { q, category, goal, audience, page: pageParam } = await searchParams;
  const isFiltered = Boolean(q || category || goal || audience);
  const page = pageNumber(pageParam);
  const skip = (page - 1) * CATALOG_PAGE_SIZE;
  /** Адрес N-й страницы с сохранением фильтров. */
  const pageQuery = (p: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (category) qs.set("category", category);
    if (goal) qs.set("goal", goal);
    if (audience) qs.set("audience", audience);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/catalog?${s}` : "/catalog";
  };

  // Персонализация хаба: «Вы уже заказывали» для залогиненных
  // (страница force-dynamic — cookies здесь допустимы).
  const session = isFiltered ? null : await getCustomerSession();
  const purchased = session ? await getPurchasedProducts(session.sub, 10) : [];

  // Категории со счётчиками подходят и сайдбару/чипсам (slug + name).
  const categories = await getCategoriesWithCounts();

  // С фильтром — как раньше: сетка товаров (страница динамическая из-за searchParams).
  if (isFiltered) {
    const { items, total } = await getProducts({
      search: q,
      categorySlug: category,
      goal: goal,
      audience: audience,
      take: CATALOG_PAGE_SIZE,
      skip,
    });
    const categoryName = category
      ? categories.find((c) => c.slug === category)?.name
      : undefined;
    const title = q
      ? `Поиск: «${q}»`
      : categoryName ||
        (goal ? goalName(goal) : undefined) ||
        (audience ? audienceName(audience) : undefined) ||
        "Каталог товаров";

    return (
      <CatalogView
        title={title}
        products={items}
        total={total}
        categories={categories}
        activeSlug={categoryName ? category : undefined}
        page={page}
        pageQuery={pageQuery}
      />
    );
  }

  // «Чистый» /catalog: на мобильном — хаб каталога, на десктопе — как раньше
  // сетка с боковым меню.
  const [{ items, total }, featured, brands, activeBrands] = await Promise.all([
    getProducts({ take: CATALOG_PAGE_SIZE, skip }),
    getProducts({ featured: true, take: 10 }),
    getFeaturedBrands(),
    getActiveBrands(),
  ]);
  // Бренды для десктопного сайдбара-фильтра (только со своими товарами).
  const sidebarBrands = activeBrands
    .filter((b) => b._count.products > 0)
    .map((b) => ({ slug: b.slug, name: b.name, count: b._count.products }));

  return (
    <>
      <div className="lg:hidden">
        <CatalogHub
          purchased={purchased}
          categories={categories}
          hits={featured.items}
          featuredBrands={brands}
        />
      </div>
      <div className="max-lg:hidden">
        {/* Десктопное стартовое окно каталога: подборки-карточки над товарами */}
        <div className="mx-auto w-full max-w-[1280px] px-4 pt-8 sm:px-6 lg:px-8">
          <h2 className="mb-3 text-xl font-extrabold tracking-tight">Подборки</h2>
          <GoalCollections variant="grid" />
        </div>
        <CatalogView
          title="Каталог товаров"
          description="Натуральные витамины, БАД, масла, мёд и бальзамы ХАЯТ."
          products={items}
          total={total}
          categories={categories}
          brands={sidebarBrands}
          page={page}
          pageQuery={pageQuery}
        />
      </div>
    </>
  );
}
