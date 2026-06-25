import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { AddressesView } from "./addresses-view";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Адреса доставки — ХАЯТ", robots: { index: false, follow: false } };

export default async function AddressesPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const addresses = await prisma.address.findMany({
    where: { customerId: session.sub },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  const data = addresses.map((a) => ({
    id: a.id,
    label: a.label,
    recipient: a.recipient,
    phone: a.phone,
    city: a.city,
    street: a.street,
    house: a.house,
    apartment: a.apartment,
    comment: a.comment,
    isDefault: a.isDefault,
  }));

  return (
    <AccountShell name={session.name}>
      <AddressesView addresses={data} />
    </AccountShell>
  );
}
