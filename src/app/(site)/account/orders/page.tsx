import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Truck, ExternalLink, ChevronRight } from "lucide-react";
import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";
import { ReorderButton, type ReorderItem } from "@/components/account/reorder-button";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_FLOW, statusIndex, trackingUrl } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Мои заказы — ХАЯТ", robots: { index: false, follow: false } };

export default async function AccountOrdersPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const orders = await prisma.order.findMany({
    where: { customerId: session.sub },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } },
    },
  });

  return (
    <AccountShell name={session.name}>
      <h1 className="mb-6 text-2xl font-extrabold">Мои заказы</h1>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-surface-soft py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-ink-faint" />
          <p className="mt-3 text-ink-muted">У вас пока нет заказов.</p>
          <Button asChild size="lg" className="mt-5"><Link href="/catalog">В каталог</Link></Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const idx = statusIndex(o.status);
            const cancelled = o.status === "CANCELLED";
            const reorderItems: ReorderItem[] = o.items.map((it) => ({
              productId: it.productId,
              slug: it.product?.slug ?? null,
              name: it.name,
              priceKopecks: it.priceKopecks,
              image: it.product?.images[0]?.url ?? null,
              qty: it.qty,
            }));
            return (
              <div key={o.id} className="rounded-2xl bg-surface p-5 ring-1 ring-line">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/account/orders/${o.number}`} className="group inline-flex items-center gap-1">
                    <span className="font-extrabold group-hover:text-brand-700">Заказ №{o.number}</span>
                    <span className="ml-1 text-sm text-ink-faint">
                      {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(o.createdAt)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                  </Link>
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
                    <ReorderButton items={reorderItems} />
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
