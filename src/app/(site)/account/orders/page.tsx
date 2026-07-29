import type { Metadata } from "next";
import { ListLink as Link } from "@/components/ui/list-link";
import { redirect } from "next/navigation";
import type { OrderStatus, Prisma } from "@prisma/client";
import { Package, Truck, ExternalLink, Tag } from "lucide-react";
import { AccountShell } from "@/components/account/account-shell";
import { RepeatOrderButton } from "@/components/account/repeat-order-button";
import { Button } from "@/components/ui/button";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { cn, formatMoney } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_FLOW, statusIndex, trackingUrl } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Мои заказы — ХАЯТ", robots: { index: false, follow: false } };

const ACTIVE_STATUSES: OrderStatus[] = ["NEW", "CONFIRMED", "PAID", "ASSEMBLING", "SHIPPED", "IN_TRANSIT"];

const FILTERS = [
  { key: "all", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "delivered", label: "Доставленные" },
  { key: "cancelled", label: "Отменённые" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

/** Тон статус-чипа: NEW/CONFIRMED — мёд, в пути — info, доставлен — успех, отменён — серый. */
const STATUS_TONE: Record<OrderStatus, string> = {
  NEW: "bg-accent-50 text-accent-700",
  CONFIRMED: "bg-accent-50 text-accent-700",
  PAID: "bg-info/10 text-info",
  ASSEMBLING: "bg-info/10 text-info",
  SHIPPED: "bg-info/10 text-info",
  IN_TRANSIT: "bg-info/10 text-info",
  DELIVERED: "bg-brand-50 text-brand-700",
  CANCELLED: "bg-surface-sunken text-ink-muted",
};

/** «1 товар», «2 товара», «5 товаров». */
function pluralItems(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} товар`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} товара`;
  return `${n} товаров`;
}

function statusWhere(filter: FilterKey): Prisma.OrderWhereInput {
  switch (filter) {
    case "active":
      return { status: { in: ACTIVE_STATUSES } };
    case "delivered":
      return { status: "DELIVERED" };
    case "cancelled":
      return { status: "CANCELLED" };
    default:
      return {};
  }
}

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const { status } = await searchParams;
  const filter: FilterKey = FILTERS.some((f) => f.key === status) ? (status as FilterKey) : "all";

  const orders = await prisma.order.findMany({
    where: { customerId: session.sub, ...statusWhere(filter) },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <AccountShell name={session.name}>
      <h1 className="mb-4 text-2xl font-extrabold sm:text-3xl">Мои заказы</h1>

      {/* Фильтр-чипсы по статусу */}
      <div className="no-scrollbar -mx-4 mb-6 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/account/orders" : `/account/orders?status=${f.key}`}
            className={cn(
              "inline-flex min-h-11 shrink-0 snap-start items-center rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition",
              filter === f.key
                ? "bg-brand-500 text-white ring-brand-500 shadow-sm"
                : "bg-surface text-ink-muted ring-line hover:bg-surface-soft",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-surface py-16 text-center ring-1 ring-line">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-soft">
            <Package className="h-8 w-8 text-ink-faint" />
          </span>
          <p className="mt-4 font-semibold text-ink">
            {filter === "all" ? "У вас пока нет заказов" : "Заказов с таким статусом нет"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {filter === "all" ? "Соберите первый — это быстро." : "Попробуйте другой фильтр."}
          </p>
          {filter === "all" ? (
            <Button asChild size="lg" className="mt-5"><Link href="/catalog">В каталог</Link></Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const idx = statusIndex(o.status);
            const cancelled = o.status === "CANCELLED";
            return (
              <div key={o.id} className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
                {/* Шапка: № · товары · сумма + статус-чип */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="tnum font-extrabold">
                    № {o.number}
                    <span className="font-semibold text-ink-muted"> · {pluralItems(o.items.length)} · {formatMoney(o.totalKopecks)}</span>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", STATUS_TONE[o.status])}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </div>
                <div className="mt-1 text-sm text-ink-faint">
                  {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(o.createdAt)}
                </div>

                {/* Прогресс доставки */}
                {!cancelled ? (
                  <div className="mt-4 flex items-center gap-1">
                    {ORDER_FLOW.map((s, i) => (
                      <div key={s} className="flex flex-1 items-center gap-1">
                        <div className={cn("h-1.5 flex-1 rounded-full", i <= idx ? "bg-brand-500" : "bg-surface-sunken")} />
                      </div>
                    ))}
                  </div>
                ) : null}

                <ul className="mt-4 divide-y divide-line text-sm">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3 py-2">
                      <span className="text-ink-muted">{it.name} <span className="text-ink-faint">× {it.qty}</span></span>
                      <span className="tnum shrink-0 font-semibold">{formatMoney(it.priceKopecks * it.qty)}</span>
                    </li>
                  ))}
                </ul>

                {o.discountKopecks > 0 ? (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-ink-muted">
                      <Tag className="h-3.5 w-3.5" /> Промокод {o.promoCode}
                    </span>
                    <span className="tnum font-semibold text-brand-700">−{formatMoney(o.discountKopecks)}</span>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <span className="tnum font-bold">Итого: {formatMoney(o.totalKopecks)}</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {o.trackingNumber ? (
                      <a
                        href={trackingUrl(o.trackingCarrier, o.trackingNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                      >
                        <Truck className="h-4 w-4" /> Отследить ({o.trackingNumber}) <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    <RepeatOrderButton orderId={o.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}
