import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Coins, BadgePercent, Truck, Wallet } from "lucide-react";
import { AccountShell } from "@/components/account/account-shell";
import { getCustomerSession } from "@/lib/customer-auth";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { cn, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Бонусные баллы — ХАЯТ",
  robots: { index: false, follow: false },
};

type Txn = {
  id: string;
  amountKopecks: number;
  reason: string;
  orderId: string | null;
  note: string | null;
  createdAt: Date;
};

/** Русская подпись операции: причины храним кодами ("order"|"redeem"|"streak"|"manual"). */
function txnLabel(t: Txn, orderNumber?: number): string {
  const num = orderNumber ? `№${orderNumber}` : "";
  switch (t.reason) {
    case "order":
      return orderNumber ? `За заказ ${num}` : "За заказ";
    case "redeem":
      return orderNumber ? `Списание в заказе ${num}` : "Списание в заказе";
    case "streak":
      return "За серию приёма";
    default:
      return t.note || "Корректировка";
  }
}

export default async function AccountBonusesPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const [customer, txns, settings] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: session.sub },
      select: { bonusKopecks: true },
    }),
    prisma.bonusTransaction.findMany({
      where: { customerId: session.sub },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getSettings(),
  ]);
  const balance = customer?.bonusKopecks ?? 0;

  // Номера заказов для подписей «За заказ №N» (в транзакции хранится только id).
  const orderIds = [...new Set(txns.map((t) => t.orderId).filter((id): id is string => Boolean(id)))];
  const orders = orderIds.length
    ? await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, number: true },
      })
    : [];
  const numberById = new Map(orders.map((o) => [o.id, o.number]));

  const dateFmt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" });

  return (
    <AccountShell name={session.name}>
      <h1 className="mb-4 text-2xl font-extrabold sm:text-3xl">Бонусные баллы</h1>

      {/* Баланс крупно */}
      <div className="animate-fade-up flex items-center gap-4 rounded-2xl bg-gradient-to-br from-accent-50 to-surface-soft p-5 ring-1 ring-line sm:p-6">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
          <Coins className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-muted">Ваш баланс</div>
          <div className="tnum text-3xl font-extrabold sm:text-4xl">{formatMoney(balance)}</div>
        </div>
      </div>

      {/* Правила программы */}
      <div className="animate-fade-up mt-5 rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5" style={{ animationDelay: "60ms" }}>
        <h2 className="font-bold">Как работают бонусы</h2>
        <ul className="mt-3 space-y-2.5 text-sm text-ink-muted">
          <li className="flex gap-2.5">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            После доставки заказа возвращаем {settings.bonusPercent}% его суммы баллами. 1 балл = 1 копейка.
          </li>
          <li className="flex gap-2.5">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            Баллами можно оплатить до 50% суммы следующего заказа — поле «Списать баллы» на оформлении.
          </li>
          <li className="flex gap-2.5">
            <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            При отмене заказа списанные баллы возвращаются на баланс, а начисленные за него — снимаются.
          </li>
        </ul>
      </div>

      {/* История операций */}
      <h2 className="animate-fade-up mt-6 mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-faint" style={{ animationDelay: "120ms" }}>
        История операций
      </h2>
      {txns.length === 0 ? (
        <div className="animate-fade-up rounded-2xl bg-surface py-14 text-center ring-1 ring-line" style={{ animationDelay: "120ms" }}>
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-soft">
            <Coins className="h-8 w-8 text-ink-faint" />
          </span>
          <p className="mt-4 font-semibold">Операций пока нет</p>
          <p className="mt-1 text-sm text-ink-muted">
            Оформите заказ — баллы появятся здесь после доставки.
          </p>
        </div>
      ) : (
        <div className="animate-fade-up overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-line divide-y divide-line" style={{ animationDelay: "120ms" }}>
          {txns.map((t) => {
            const plus = t.amountKopecks > 0;
            return (
              <div key={t.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {txnLabel(t, t.orderId ? numberById.get(t.orderId) : undefined)}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-faint">{dateFmt.format(t.createdAt)}</div>
                </div>
                <span className={cn("tnum shrink-0 font-extrabold", plus ? "text-brand-700" : "text-sale")}>
                  {plus ? "+" : "−"}{formatMoney(Math.abs(t.amountKopecks))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}
