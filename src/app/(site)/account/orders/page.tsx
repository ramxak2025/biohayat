import type { Metadata } from "next";
import Link from "next/link";
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
      <h1 className="mb-4 text-2xl font-extrabold">Мои заказы</h1>

      {/* Фильтр по статусу */}
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/account/orders" : `/account/orders?status=${f.key}`}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition",
              filter === f.key
                ? "bg-brand-500 text-white ring-brand-500 shadow-sm"
                : "bg-surface text-ink-muted ring-line-strong hover:bg-surface-soft",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-surface-soft py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-ink-faint" />
          <p className="mt-3 text-ink-muted">
            {filter === "all" ? "У вас пока нет заказов." : "Заказов с таким статусом нет."}
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
              <div key={o.id} className="rounded-2xl bg-surface p-5 ring-1 ring-line">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold">Заказ №{o.number}</span>
                    <span className="ml-2 text-sm text-ink-faint">
                      {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(o.createdAt)}
                    </span>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${cancelled ? "bg-danger/10 text-danger" : "bg-brand-50 text-brand-700"}`}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </div>

                {/* прогресс доставки */}
                {!cancelled ? (
                  <div className="mt-4 flex items-center gap-1">
                    {ORDER_FLOW.map((s, i) => (
                      <div key={s} className="flex flex-1 items-center gap-1">
                        <div className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-brand-500" : "bg-surface-sunken"}`} />
                      </div>
                    ))}
                  </div>
                ) : null}

                <ul className="mt-4 divide-y divide-line text-sm">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex justify-between py-2">
                      <span className="text-ink-muted">{it.name} <span className="text-ink-faint">× {it.qty}</span></span>
                      <span className="font-semibold">{formatMoney(it.priceKopecks * it.qty)}</span>
                    </li>
                  ))}
                </ul>

                {o.discountKopecks > 0 ? (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-ink-muted">
                      <Tag className="h-3.5 w-3.5" /> Промокод {o.promoCode}
                    </span>
                    <span className="font-semibold text-brand-700">−{formatMoney(o.discountKopecks)}</span>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <span className="font-bold">Итого: {formatMoney(o.totalKopecks)}</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {o.trackingNumber ? (
                      <a
                        href={trackingUrl(o.trackingCarrier, o.trackingNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
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
