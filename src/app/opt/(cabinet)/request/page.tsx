import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { getB2BAccount } from "@/lib/b2b-auth";
import { getWholesaleProducts } from "@/lib/wholesale";
import { RequestForm } from "@/components/opt/request-form";
import type { PriceItem } from "@/components/opt/price-math";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Оптовая заявка — ХАЯТ Опт",
  robots: { index: false, follow: false },
};

export default async function OptRequestPage() {
  const account = await getB2BAccount();
  if (!account) redirect("/opt/login");
  if (account.status !== "APPROVED") redirect("/opt/pending");

  // Данные позиций приходят с сервера; в корзине хранятся только id и qty.
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

  return (
    <Container className="max-w-3xl py-6 sm:py-8">
      <RequestForm items={items} />
    </Container>
  );
}
