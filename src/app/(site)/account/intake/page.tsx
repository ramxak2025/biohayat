import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { IntakeView } from "./intake-view";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Приём БАД — ХАЯТ", robots: { index: false, follow: false } };

/** Дата → строка YYYY-MM-DD (зона сервера). */
function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Локальная дата «сегодня» в формате YYYY-MM-DD (зона сервера). */
function todayStr(): string {
  return dateStr(new Date());
}

/** Окно последних N дней (включая сегодня) как массив YYYY-MM-DD по убыванию. */
function lastNDays(n: number): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(dateStr(d));
  }
  return out;
}

export default async function IntakePage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const today = todayStr();
  const windowDays = lastNDays(30);
  const since = windowDays[windowDays.length - 1]; // самая ранняя дата окна

  // Активные курсы клиента + логи за последние 30 дней (для стрика/приверженности).
  const plans = await prisma.intakePlan.findMany({
    where: { customerId: session.sub, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      logs: { where: { day: { gte: since } } },
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
  const plansData = plans.map((p) => {
    // Карта «день → отмеченные слоты» за окно наблюдения.
    const logsByDay: Record<string, string[]> = {};
    for (const l of p.logs) {
      (logsByDay[l.day] ??= []).push(l.slot);
    }
    return {
      id: p.id,
      title: p.title,
      times: p.times,
      durationDays: p.durationDays,
      note: p.note,
      startDate: p.startDate.toISOString(),
      takenSlots: logsByDay[today] ?? [],
      logsByDay,
    };
  });

  return (
    <AccountShell name={session.name}>
      <IntakeView today={today} windowDays={windowDays} plans={plansData} products={products} />
    </AccountShell>
  );
}
