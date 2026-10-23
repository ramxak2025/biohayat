import { isDueOn } from "../../../../../shared/intake-calendar";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { PushOptIn } from "@/components/account/push-opt-in";
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
    where: { customerId: session.sub, },
    orderBy: { createdAt: "desc" },
    include: {
      logs: { where: { day: today, taken: true } },
    },
  });

  // ── История за последние 28 дней (4 недели × 7) ──
  const days: string[] = [];
  for (let i = 27; i >= 0; i--) days.push(toDayStr(addDays(now, -i)));

  const planIds = plans.map((p) => p.id);
  const historyLogs = planIds.length
    ? await prisma.intakeLog.findMany({
        where: { taken: true, planId: { in: planIds }, day: { gte: days[0], lte: today } },
        select: { day: true },
      })
    : [];
  const takenByDay = new Map<string, number>();
  for (const log of historyLogs) {
    takenByDay.set(log.day, (takenByDay.get(log.day) ?? 0) + 1);
  }

  // History records actual intake; current prescriptions cannot reconstruct old expectations.
  const history: IntakeHistoryDay[] = days.map(day => ({ day, taken: takenByDay.get(day) ?? 0, total: takenByDay.get(day) ?? 0 }));

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

  // Публичный VAPID-ключ для подписки на push (генерируется при старте сервера, см. src/instrumentation.ts).
  const pushSettings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
    select: { vapidPublicKey: true },
  });

  // Сериализуем только нужные поля, чтобы клиентский компонент получил простые данные.
  const plansData = plans.map((p) => ({
    id: p.id,
    dueToday: isDueOn({ ...p, anchorDay: p.anchorDay ?? toDayStr(p.startDate) }, today),
    anchorDay: p.anchorDay ?? toDayStr(p.startDate),
    intervalDays: p.intervalDays,
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
      <div className="mt-4">
        <PushOptIn publicKey={pushSettings?.vapidPublicKey ?? ""} />
      </div>
    </AccountShell>
  );
}
