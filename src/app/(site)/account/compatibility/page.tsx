import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { COMPATIBILITY_EVIDENCE } from "@/lib/compatibility-evidence";
import { CompatibilityTool } from "./compatibility-tool";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Совместимость БАД — ХАЯТ",
  robots: { index: false, follow: false },
};

export default async function AccountCompatibilityPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const { rules, components } = COMPATIBILITY_EVIDENCE;

  // Активные курсы клиента → компоненты его добавок (для предвыбора)
  const plans = await prisma.intakePlan.findMany({
    where: { customerId: session.sub, isActive: true },
    include: { product: { select: { nutrients: true } } },
  });
  const canonical = new Map(components.map(component => [component.name.toLowerCase().replace(/ё/g, "е"), component.name]));
  const counts = new Map<string, number>();
  for (const plan of plans) {
    const perCourse = new Set((plan.product?.nutrients ?? []).map(raw => canonical.get(raw.trim().toLowerCase().replace(/ё/g, "е")) ?? raw.trim()).filter(Boolean));
    for (const name of perCourse) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const taken = new Set(counts.keys());
  const overlappingComponents = [...counts].filter(([, count]) => count > 1).map(([name]) => name);

  return (
    <AccountShell name={session.name}>
      <CompatibilityTool
        rules={rules}
        unassessedCourses={plans.map(plan => plan.title)}
        overlappingComponents={overlappingComponents}
        components={components}
        preselected={[...taken]}
      />
    </AccountShell>
  );
}
