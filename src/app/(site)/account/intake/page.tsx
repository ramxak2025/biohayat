import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { IntakeView, type IntakeHistoryDay } from "./intake-view";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Приём БАД — ХАЯТ", robots: { index: false, follow: false } };

/** Дата в формате YYYY-MM-DD (зона сервера). */
function toDayStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}

export default async function IntakePage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const now = new Date();
  const today = toDayStr(now);

  // Активные курсы клиента + логи за сегодня.
  const plans = await prisma.intakePlan.findMany({
    where: { customerId: session.sub, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      logs: { where: { day: today } },
    },
  });

  // ── История за последние 28 дней (4 недели × 7) ──
  const days: string[] = [];
  for (let i = 27; i >= 0; i--) days.push(toDayStr(addDays(now, -i)));

  const planIds = plans.map((p) => p.id);
  const historyLogs = planIds.length
    ? await prisma.intakeLog.findMany({
        where: { planId: { in: planIds }, day: { gte: days[0], lte: today } },
        select: { day: true },
      })
    : [];
  const takenByDay = new Map<string, number>();
  for (const log of historyLogs) {
    takenByDay.set(log.day, (takenByDay.get(log.day) ?? 0) + 1);
  }

  // Окно активности курса: от startDate до startDate + durationDays − 1 (или бессрочно).
  const planWindows = plans.map((p) => ({
    slots: p.times.length,
    start: toDayStr(p.startDate),
    end: p.durationDays ? toDayStr(addDays(p.startDate, p.durationDays - 1)) : null,
  }));

  const history: IntakeHistoryDay[] = days.map((day) => {
    const total = planWindows.reduce(
      (s, w) => s + (day >= w.start && (!w.end || day <= w.end) ? w.slots : 0),
      0,
    );
    const taken = Math.min(takenByDay.get(day) ?? 0, total);
    return { day, taken, total };
  });

  // Товары каталога для привязки нового курса.
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  // Купленные пользователем БАД — приоритетный выбор при добавлении курса.
  const purchasedItems = await prisma.orderItem.findMany({
    where: {
      order: { customerId: session.sub },
      productId: { not: null },
      product: { isActive: true },
    },
    select: { product: { select: { id: true, name: true } }, order: { select: { createdAt: true } } },
    orderBy: { order: { createdAt: "desc" } },
    take: 100,
  });
  const seenIds = new Set<string>();
  const purchased: { id: string; name: string }[] = [];
  for (const it of purchasedItems) {
    if (it.product && !seenIds.has(it.product.id)) {
      seenIds.add(it.product.id);
      purchased.push(it.product);
    }
  }

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
      <IntakeView today={today} plans={plansData} products={products} purchased={purchased} history={history} />
    </AccountShell>
  );
}
