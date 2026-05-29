import Link from "next/link";
import { notFound } from "next/navigation";
import { Package, Heart, ExternalLink } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" });
const dateTimeFmt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" });

// Тон Pill по статусу заказа
const STATUS_TONE: Record<OrderStatus, "green" | "red" | "amber" | "blue" | "neutral"> = {
  NEW: "blue",
  CONFIRMED: "blue",
  PAID: "amber",
  ASSEMBLING: "amber",
  SHIPPED: "amber",
  IN_TRANSIT: "amber",
  DELIVERED: "green",
  CANCELLED: "red",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-ink-faint">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" } },
      favorites: {
        include: { product: { select: { slug: true, name: true, priceKopecks: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!customer) notFound();

  return (
    <>
      <AdminHeader title={customer.name} description="Карточка клиента (только просмотр)" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Профиль */}
        <Card className="space-y-1 lg:col-span-1">
          <h2 className="mb-2 font-bold">Профиль</h2>
          <div className="divide-y divide-line text-sm">
            <Row label="Имя" value={customer.name} />
            <Row label="Телефон" value={customer.phone} />
            <Row label="Email" value={customer.email || "—"} />
            <Row label="Город" value={customer.city || "—"} />
            <Row label="Статус" value={
              <Pill tone={customer.isActive ? "green" : "neutral"}>
                {customer.isActive ? "Активен" : "Заблокирован"}
              </Pill>
            } />
            <Row label="Регистрация" value={dateFmt.format(customer.createdAt)} />
            <Row label="Последний вход" value={customer.lastLoginAt ? dateTimeFmt.format(customer.lastLoginAt) : "—"} />
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* Заказы */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <Package className="h-5 w-5 text-brand-500" /> Заказы
              <span className="text-sm font-semibold text-ink-faint">({customer.orders.length})</span>
            </h2>
            {customer.orders.length === 0 ? (
              <EmptyState>У клиента нет заказов.</EmptyState>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
                    <tr>
                      <th className="p-4 font-semibold">№</th>
                      <th className="p-4 font-semibold">Дата</th>
                      <th className="p-4 font-semibold">Статус</th>
                      <th className="p-4 font-semibold text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {customer.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-surface-soft/50">
                        <td className="p-4">
                          <Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">
                            №{o.number}
                          </Link>
                        </td>
                        <td className="p-4 text-ink-muted">{dateFmt.format(o.createdAt)}</td>
                        <td className="p-4">
                          <Pill tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Pill>
                        </td>
                        <td className="p-4 text-right font-semibold">{formatMoney(o.totalKopecks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>

          {/* Избранное */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <Heart className="h-5 w-5 text-brand-500" /> Избранное
              <span className="text-sm font-semibold text-ink-faint">({customer.favorites.length})</span>
            </h2>
            {customer.favorites.length === 0 ? (
              <EmptyState>В избранном пусто.</EmptyState>
            ) : (
              <Card className="space-y-2 p-3">
                {customer.favorites.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-surface-soft/50">
                    <span className="min-w-0 truncate font-semibold">{f.product.name}</span>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm text-ink-muted">{formatMoney(f.product.priceKopecks)}</span>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/product/${f.product.slug}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
