import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { getB2BAccount } from "@/lib/b2b-auth";
import { getWholesaleProducts } from "@/lib/wholesale";
import { PriceView } from "@/components/opt/price-view";
import type { PriceItem } from "@/components/opt/price-math";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Прайс-лист — ХАЯТ Опт",
  robots: { index: false, follow: false },
};

export default async function OptPricePage() {
  const account = await getB2BAccount();
  if (!account) redirect("/opt/login");
  if (account.status !== "APPROVED") redirect("/opt/pending");

  const products = await getWholesaleProducts();
  const items: PriceItem[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    volume: p.volume,
    image: p.images[0]?.url ?? null,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    retailKopecks: p.priceKopecks,
    tiers: p.wholesaleTiers.map((t) => ({ minQty: t.minQty, priceKopecks: t.priceKopecks })),
  }));

  const dateLabel = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date());

  return (
    <Container className="py-6 sm:py-8">
      <PriceView company={account.company} dateLabel={dateLabel} items={items} />
    </Container>
  );
}
