import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { AddressesView } from "./addresses-view";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Мои адреса — ХАЯТ", robots: { index: false, follow: false } };

export default async function AddressesPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const addresses = await prisma.customerAddress.findMany({
    where: { customerId: session.sub },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, label: true, city: true, street: true, isDefault: true },
  });

  return (
    <AccountShell name={session.name}>
      <AddressesView addresses={addresses} />
    </AccountShell>
  );
}
