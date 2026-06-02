import type { Metadata } from "next";
import { CatalogView } from "@/components/product/catalog-view";
import { CollectionTiles } from "@/components/site/collection-tiles";
import { Container } from "@/components/ui/container";
import { getNavCategories, getProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [{ items, total }, categories] = await Promise.all([
    getProducts({ search: q, take: 60 }),
    getNavCategories(),
  ]);

  return (
    <>
      {!q ? (
        <Container className="space-y-7 pt-6">
          <div>
            <h2 className="mb-1 text-lg font-extrabold tracking-tight">Кому</h2>
            <p className="mb-3 text-sm text-ink-muted">Подборки для всей семьи</p>
            <CollectionTiles variant="audience" />
          </div>
          <div>
            <h2 className="mb-1 text-lg font-extrabold tracking-tight">Зачем</h2>
            <p className="mb-3 text-sm text-ink-muted">Подберите по вашей цели</p>
            <CollectionTiles variant="goal" />
          </div>
        </Container>
      ) : null}
      <CatalogView
        title={q ? `Поиск: «${q}»` : "Каталог товаров"}
        description={q ? null : "Натуральные витамины, БАД, масла, мёд и бальзамы ХАЯТ."}
        products={items}
        total={total}
        categories={categories}
      />
    </>
  );
}
