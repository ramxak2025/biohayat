import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/product/catalog-view";
import { getNavCategories, getProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { AUDIENCES, audienceName } from "@/lib/taxonomy";

export function generateStaticParams() {
  return AUDIENCES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = audienceName(slug);
  const settings = await getSettings();
  if (!name) return {};
  return buildMetadata(
    { title: `БАД и витамины ${name.toLowerCase()}`, description: `Подборка натуральных БАД и витаминов ${name.toLowerCase()} от компании ХАЯТ.`, path: `/for/${slug}` },
    settings,
  );
}

export default async function AudiencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = audienceName(slug);
  if (!name) notFound();

  const [{ items, total }, categories] = await Promise.all([
    getProducts({ audience: slug, take: 60 }),
    getNavCategories(),
  ]);

  return (
    <CatalogView
      title={name}
      description={`Натуральные витамины и БАД — подборка «${name}».`}
      products={items}
      total={total}
      categories={categories}
      basePath={`/for/${slug}`}
    />
  );
}
