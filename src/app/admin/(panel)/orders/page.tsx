import Link from "next/link";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { STATUS_LABELS } from "./order-controls";
import type { BitrixSyncStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const BITRIX_LABEL: Record<BitrixSyncStatus, { label: string; tone: "green" | "red" | "amber" | "neutral" }> = {
  SYNCED: { label: "В Битрикс24", tone: "green" },
  FAILED: { label: "Ошибка", tone: "red" },
  PENDING: { label: "Ожидает", tone: "amber" },
  DISABLED: { label: "Интеграция выкл.", tone: "neutral" },
};

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { _count: { select: { items: true } } },
  });

  return (
    <>
      <AdminHeader title="Заявки" description={`Всего: ${orders.length}`} />
      {orders.length === 0 ? (
        <EmptyState>Заявок пока нет.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="p-4 font-semibold">№</th>
                <th className="p-4 font-semibold">Клиент</th>
                <th className="p-4 font-semibold">Сумма</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4 font-semibold">Битрикс24</th>
                <th className="p-4 font-semibold">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => {
                const b = BITRIX_LABEL[o.bitrixSyncStatus];
                return (
                  <tr key={o.id} className="hover:bg-surface-soft/50">
                    <td className="p-4">
                      <Link href={`/admin/orders/${o.id}`} className="font-bold text-brand-700 hover:underline">
                        №{o.number}
                      </Link>
                    </td>
                    <td className="p-4">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-brand-700">
                        {o.customerName}
                      </Link>
                      <div className="text-xs text-ink-faint">{o.phone} · {o._count.items} тов.</div>
                    </td>
                    <td className="p-4 font-bold">{formatMoney(o.totalKopecks)}</td>
                    <td className="p-4">
                      <Pill tone={o.status === "NEW" ? "amber" : o.status === "CANCELLED" ? "red" : "green"}>
                        {STATUS_LABELS[o.status]}
                      </Pill>
                    </td>
                    <td className="p-4"><Pill tone={b.tone}>{b.label}</Pill></td>
                    <td className="p-4 text-ink-muted">
                      {new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(o.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
