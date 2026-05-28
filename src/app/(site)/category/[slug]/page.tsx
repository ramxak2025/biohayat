import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { CatalogView } from "@/components/product/catalog-view";
import { getCategoryBySlug, getNavCategories, getProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { categoryMetadata, breadcrumbJsonLd } from "@/lib/seo";

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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category || !category.isActive) notFound();

  const [{ items, total }, categories] = await Promise.all([
    getProducts({ categorySlug: slug, take: 60 }),
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
      />
    </>
  );
}
