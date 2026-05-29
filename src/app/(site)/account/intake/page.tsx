import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { IntakeView } from "./intake-view";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Приём БАД — ХАЯТ", robots: { index: false, follow: false } };

/** Локальная дата «сегодня» в формате YYYY-MM-DD (зона сервера). */
function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function IntakePage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const today = todayStr();

  // Активные курсы клиента + логи за сегодня.
  const plans = await prisma.intakePlan.findMany({
    where: { customerId: session.sub, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      logs: { where: { day: today } },
    },
  });

  // Товары каталога для привязки нового курса.
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  // Сериализуем только нужные поля, чтобы клиентский компонент получил простые данные.
  const plansData = plans.map((p) => ({
    id: p.id,
    title: p.title,
    times: p.times,
    durationDays: p.durationDays,
    note: p.note,
    startDate: p.startDate.toISOString(),
    takenSlots: p.logs.map((l) => l.slot),
  }));

  return (
    <AccountShell name={session.name}>
      <IntakeView today={today} plans={plansData} products={products} />
    </AccountShell>
  );
}
