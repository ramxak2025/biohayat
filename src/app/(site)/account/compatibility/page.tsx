import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { NUTRIENT_KEYWORDS } from "@/lib/taxonomy";
import { CompatibilityTool } from "./compatibility-tool";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Совместимость БАД — ХАЯТ",
  robots: { index: false, follow: false },
};

export default async function AccountCompatibilityPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  // Все активные правила совместимости
  const rules = await prisma.compatibilityRule.findMany({
    where: { isActive: true },
    orderBy: { componentA: "asc" },
  });

  // Активные курсы клиента → компоненты принимаемых им добавок
  const plans = await prisma.intakePlan.findMany({
    where: { customerId: session.sub, isActive: true },
    include: { product: { select: { nutrients: true } } },
  });

  // Компоненты из курсов клиента (предвыбор)
  const taken = new Set<string>();
  for (const p of plans) {
    for (const n of p.product?.nutrients ?? []) taken.add(n);
  }

  // Список уникальных компонентов: из правил + из словаря NUTRIENT_KEYWORDS
  const components = new Set<string>(Object.keys(NUTRIENT_KEYWORDS));
  for (const r of rules) {
    components.add(r.componentA);
    components.add(r.componentB);
  }
  // Принимаемые компоненты тоже включаем в список выбора (на случай нестандартных)
  for (const t of taken) components.add(t);

  const allComponents = [...components].sort((a, b) => a.localeCompare(b, "ru"));

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
        components={allComponents}
        preselected={[...taken]}
      />
    </AccountShell>
  );
}
