import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Truck, ExternalLink, MapPin, MessageSquare } from "lucide-react";
import { AccountShell } from "@/components/account/account-shell";
import { ReorderButton, type ReorderItem } from "@/components/account/reorder-button";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_FLOW, statusIndex, trackingUrl } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Заказ — ХАЯТ", robots: { index: false, follow: false } };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const { number } = await params;
  const num = parseInt(number, 10);
  if (Number.isNaN(num)) notFound();

  const order = await prisma.order.findUnique({
    where: { number: num },
    include: {
      items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } },
    },
  });

  // Доступ только к собственным заказам.
  if (!order || order.customerId !== session.sub) notFound();

  const idx = statusIndex(order.status);
  const cancelled = order.status === "CANCELLED";

  const reorderItems: ReorderItem[] = order.items.map((it) => ({
    productId: it.productId,
    slug: it.product?.slug ?? null,
    name: it.name,
    priceKopecks: it.priceKopecks,
    image: it.product?.images[0]?.url ?? null,
    qty: it.qty,
  }));

  return (
    <AccountShell name={session.name}>
      <Link href="/account/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> К заказам
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Заказ №{order.number}</h1>
          <p className="mt-0.5 text-sm text-ink-faint">
            {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(order.createdAt)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${cancelled ? "bg-danger/10 text-danger" : "bg-brand-50 text-brand-700"}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Прогресс статуса */}
      {!cancelled ? (
        <div className="mb-6 rounded-2xl bg-surface p-5 ring-1 ring-line">
          <div className="flex items-center gap-1">
            {ORDER_FLOW.map((s, i) => (
              <div key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                <div className={`h-full rounded-full ${i <= idx ? "bg-brand-500" : ""}`} style={{ width: "100%" }} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
            {ORDER_FLOW.map((s, i) => (
              <span key={s} className={i <= idx ? "font-bold text-brand-700" : ""}>
                {ORDER_STATUS_LABELS[s]}
              </span>
            ))}
          </div>
          {order.trackingNumber ? (
            <a
              href={trackingUrl(order.trackingCarrier, order.trackingNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            >
              <Truck className="h-4 w-4" /> Отследить ({order.trackingNumber}) <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Позиции */}
      <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
        <h2 className="mb-3 font-bold">Состав заказа</h2>
        <ul className="divide-y divide-line text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                {it.product ? (
                  <Link href={`/product/${it.product.slug}`} className="font-semibold text-ink hover:text-brand-700">{it.name}</Link>
                ) : (
                  <span className="font-semibold text-ink">{it.name}</span>
                )}
                <span className="ml-1 text-ink-faint">× {it.qty}</span>
              </span>
              <span className="shrink-0 font-semibold">{formatMoney(it.priceKopecks * it.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="font-bold">Итого</span>
          <span className="text-lg font-extrabold">{formatMoney(order.totalKopecks)}</span>
        </div>
        <div className="mt-4">
          <ReorderButton items={reorderItems} size="md" variant="primary" label="Повторить заказ" />
        </div>
      </div>

      {/* Доставка и комментарий */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4 text-brand-500" /> Доставка</div>
          <p className="text-sm text-ink-muted">{order.address || "Адрес не указан"}</p>
          <p className="mt-2 text-sm text-ink-faint">{order.customerName}, {order.phone}</p>
        </div>
        {order.comment ? (
          <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
            <div className="mb-1.5 flex items-center gap-2 text-sm font-bold"><MessageSquare className="h-4 w-4 text-brand-500" /> Комментарий</div>
            <p className="text-sm text-ink-muted">{order.comment}</p>
          </div>
        ) : null}
      </div>
    </AccountShell>
  );
}
