import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { COMPATIBILITY_COMPONENTS } from "../../../../../prisma/seed-data/compatibility";
import { CompatibilityTool } from "./compatibility-tool";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Совместимость БАД — ХАЯТ",
  robots: { index: false, follow: false },
};

export default async function AccountCompatibilityPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const rules = await prisma.compatibilityRule.findMany({
    where: { isActive: true },
    orderBy: { componentA: "asc" },
  });

  // Активные курсы клиента → компоненты его добавок (для предвыбора)
  const plans = await prisma.intakePlan.findMany({
    where: { customerId: session.sub, isActive: true },
    include: { product: { select: { nutrients: true } } },
  });
  const taken = new Set<string>();
  for (const p of plans) for (const n of p.product?.nutrients ?? []) taken.add(n);

  // Канонический словарь компонентов с группами (из seed-данных) + любые
  // нестандартные из правил/курсов, не попавшие в словарь.
  const known = new Set(COMPATIBILITY_COMPONENTS.map((c) => c.name));
  const extra = new Set<string>();
  for (const r of rules) {
    if (!known.has(r.componentA)) extra.add(r.componentA);
    if (!known.has(r.componentB)) extra.add(r.componentB);
  }
  for (const t of taken) if (!known.has(t)) extra.add(t);

  const components = [
    ...COMPATIBILITY_COMPONENTS.map((c) => ({ name: c.name, group: c.group })),
    ...[...extra].map((name) => ({ name, group: "Другое" as const })),
  ];

  return (
    <AccountShell name={session.name}>
      <CompatibilityTool
        rules={rules.map((r) => ({
          id: r.id,
          componentA: r.componentA,
          componentB: r.componentB,
          type: r.type,
          note: r.note,
        }))}
        components={components}
        preselected={[...taken]}
      />
    </AccountShell>
  );
}
