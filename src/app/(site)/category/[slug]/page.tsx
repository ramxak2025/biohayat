import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { CatalogView } from "@/components/product/catalog-view";
import {
  getCategoryBySlug,
  getNavCategories,
  getSortedProducts,
  parseProductSort,
} from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { categoryMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 300;
// Регистрирует маршрут как ISR: страницы генерируются при первом запросе
// и кэшируются (на сборке БД не нужна, поэтому список пуст).
export function generateStaticParams() {
  return [];
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  const settings = await getSettings();
  return categoryMetadata(category, settings);
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const [{ slug }, { sort: sortParam }] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category || !category.isActive) notFound();

  const sort = parseProductSort(sortParam);
  const [{ items, total }, categories] = await Promise.all([
    getSortedProducts({ categorySlug: slug, take: 60 }, sort),
    getNavCategories(),
  ]);

  return (
    <>
      <Script id="ld-breadcrumb" type="application/ld+json">
        {JSON.stringify(
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Каталог", path: "/catalog" },
            { name: category.name, path: `/category/${category.slug}` },
          ]),
        )}
      </Script>
      <CatalogView
        title={category.name}
        description={category.description}
        products={items}
        total={total}
        categories={categories}
        activeSlug={slug}
        basePath={`/category/${slug}`}
        sort={sort}
        sortBase={`/category/${slug}`}
      />
    </>
  );
}
