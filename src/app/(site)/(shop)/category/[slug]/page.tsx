import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { CatalogView, CATALOG_PAGE_SIZE, pageNumber } from "@/components/product/catalog-view";
import {
  getCategoryBySlug,
  getNavCategories,
  getSortedProducts,
  parseProductSort,
} from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { categoryMetadata, breadcrumbJsonLd } from "@/lib/seo";

// Страница читает searchParams (?sort=) — ISR с ними несовместим
// (DYNAMIC_SERVER_USAGE → 500). Рендер на запрос; данные из Data Cache.
export const dynamic = "force-dynamic";


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
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const [{ slug }, { sort: sortParam, page: pageParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const category = await getCategoryBySlug(slug);
  if (!category || !category.isActive) notFound();

  const sort = parseProductSort(sortParam);
  const page = pageNumber(pageParam);
  const [{ items, total }, categories] = await Promise.all([
    getSortedProducts(
      {
        categorySlug: slug,
        take: CATALOG_PAGE_SIZE,
        skip: (page - 1) * CATALOG_PAGE_SIZE,
      },
      sort,
    ),
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
        page={page}
        pageQuery={(p) =>
          `/category/${slug}?${new URLSearchParams({
            ...(sort !== "popular" ? { sort } : {}),
            ...(p > 1 ? { page: String(p) } : {}),
          })}`
        }
      />
    </>
  );
}
