import type { Metadata } from "next";
import { CatalogView, CATALOG_PAGE_SIZE, pageNumber } from "@/components/product/catalog-view";
import { getNavCategories, getProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";

// ISR: распродажа отдаётся статически, перегенерация раз в 5 минут.
// Без параметров: рендер на каждый запрос (данные берутся из Data Cache,
// поэтому это дёшево). Статический пререндер потребовал бы БД на сборке.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata(
    {
      title: "Акции и скидки",
      description: "Выгодные предложения и скидки на натуральные витамины и БАД ХАЯТ.",
      path: "/sale",
    },
    settings,
  );
}

export default async function SalePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageNumber((await searchParams).page);
  const [{ items, total }, categories] = await Promise.all([
    getProducts({
      onSale: true,
      take: CATALOG_PAGE_SIZE,
      skip: (page - 1) * CATALOG_PAGE_SIZE,
    }),
    getNavCategories(),
  ]);

  return (
    <CatalogView
      title="Распродажа"
      description="Товары по специальной цене. Используйте промокод FREE25Hayat — −25% на первый заказ."
      products={items}
      total={total}
      categories={categories}
      basePath="/sale"
      page={page}
      pageQuery={(p) => (p > 1 ? `/sale?page=${p}` : "/sale")}
    />
  );
}
