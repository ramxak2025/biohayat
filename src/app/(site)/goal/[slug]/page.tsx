import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/product/catalog-view";
import { getNavCategories, getProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { goalName } from "@/lib/taxonomy";

// ISR: подборка по цели отдаётся статически, перегенерация раз в 5 минут.
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
  const name = goalName(slug);
  const settings = await getSettings();
  if (!name) return {};
  return buildMetadata(
    { title: `БАД для цели «${name}»`, description: `Подборка БАД и витаминов ХАЯТ для цели «${name}».`, path: `/goal/${slug}` },
    settings,
  );
}

export default async function GoalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = goalName(slug);
  if (!name) notFound();

  const [{ items, total }, categories] = await Promise.all([
    getProducts({ goal: slug, take: 60 }),
    getNavCategories(),
  ]);

  return (
    <CatalogView
      title={name}
      description={`Подборка продукции ХАЯТ для цели «${name}».`}
      products={items}
      total={total}
      categories={categories}
      basePath={`/goal/${slug}`}
    />
  );
}
