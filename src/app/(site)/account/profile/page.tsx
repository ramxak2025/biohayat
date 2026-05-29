import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { ProfileForm } from "./profile-form";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Профиль — ХАЯТ", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");
  const customer = await prisma.customer.findUnique({ where: { id: session.sub } });
  if (!customer) redirect("/account");

  return (
    <AccountShell name={session.name}>
      <h1 className="mb-6 text-2xl font-extrabold">Профиль</h1>
      <ProfileForm customer={customer} />
    </AccountShell>
  );
}
