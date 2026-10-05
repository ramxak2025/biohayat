import { formatAddressLine } from "@/app/api/v2/addresses/_address";
import type { Metadata } from "next";
import { CheckoutForm, type SavedAddress } from "./checkout-form";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Оформление заказа — ХАЯТ",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const session = await getCustomerSession();

  let addresses: SavedAddress[] = [];
  let defaults: { name?: string; phone?: string; email?: string } = {};
  let bonusBalanceKopecks = 0;
  if (session) {
    const [customer, saved] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: session.sub },
        select: { name: true, phone: true, email: true, bonusKopecks: true },
      }),
      prisma.customerAddress.findMany({
        where: { customerId: session.sub },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: { id: true, label: true, city: true, street: true, house: true, apartment: true, comment: true, isDefault: true },
      }),
    ]);
    addresses = saved.map(a => ({ ...a, street: formatAddressLine({ ...a, city: "" }) }));
    defaults = {
      name: customer?.name,
      phone: customer?.phone,
      email: customer?.email ?? undefined,
    };
    bonusBalanceKopecks = customer?.bonusKopecks ?? 0;
  }

  return (
    <CheckoutForm
      loggedIn={Boolean(session)}
      addresses={addresses}
      defaults={defaults}
      bonusBalanceKopecks={bonusBalanceKopecks}
    />
  );
}
