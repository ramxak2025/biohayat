import type { Metadata } from "next";
import { CatalogView } from "@/components/product/catalog-view";
import { CatalogHub } from "@/components/site/catalog-hub";
import { getCategoriesWithCounts, getProducts } from "@/lib/queries";
import { audienceName, goalName } from "@/lib/taxonomy";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";

// Каталог фильтруется query-параметрами — всегда рендер на запрос
// (и без обращения к БД на этапе сборки).
export const dynamic = "force-dynamic";

interface CatalogSearchParams {
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
  const { q, category, goal, audience } = await searchParams;
  const isFiltered = Boolean(q || category || goal || audience);

  // Категории со счётчиками подходят и сайдбару/чипсам (slug + name).
  const categories = await getCategoriesWithCounts();

  // С фильтром — как раньше: сетка товаров (страница динамическая из-за searchParams).
  if (isFiltered) {
    const { items, total } = await getProducts({
      search: q,
      categorySlug: category,
      goal: goal,
      audience: audience,
      take: 60,
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
      />
    );
  }

  // «Чистый» /catalog: на мобильном — хаб каталога, на десктопе — как раньше
  // сетка с боковым меню.
  const [{ items, total }, featured] = await Promise.all([
    getProducts({ take: 60 }),
    getProducts({ featured: true, take: 10 }),
  ]);

  return (
    <>
      <div className="lg:hidden">
        <CatalogHub categories={categories} hits={featured.items} />
      </div>
      <div className="max-lg:hidden">
        <CatalogView
          title="Каталог товаров"
          description="Натуральные витамины, БАД, масла, мёд и бальзамы ХАЯТ."
          products={items}
          total={total}
          categories={categories}
        />
      </div>
    </>
  );
}
