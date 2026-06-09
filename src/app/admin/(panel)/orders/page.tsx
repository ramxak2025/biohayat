import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";
import { cn, formatMoney } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { STATUS_LABELS } from "./order-controls";
import type { BitrixSyncStatus, OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const BITRIX_LABEL: Record<BitrixSyncStatus, { label: string; tone: "green" | "red" | "amber" | "neutral" }> = {
  SYNCED: { label: "В Битрикс24", tone: "green" },
  FAILED: { label: "Ошибка", tone: "red" },
  PENDING: { label: "Ожидает", tone: "amber" },
  DISABLED: { label: "Интеграция выкл.", tone: "neutral" },
};

/** Ссылка на список с сохранением фильтра по статусу. */
function listHref(page: number, status?: OrderStatus): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (status) params.set("status", status);
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: rawPage, status: rawStatus } = await searchParams;
  const status =
    rawStatus && rawStatus in ORDER_STATUS_LABELS ? (rawStatus as OrderStatus) : undefined;
  const where = status ? { status } : {};

  const total = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number(rawPage) || 1));

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { _count: { select: { items: true } } },
  });

  return (
    <>
      <AdminHeader
        title="Заявки"
        description={`Всего: ${total}${totalPages > 1 ? ` · страница ${page} из ${totalPages}` : ""}`}
      />

      {/* Фильтр по статусу */}
      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href={listHref(1)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-semibold transition",
            !status ? "bg-brand-500 text-white" : "bg-surface text-ink-muted ring-1 ring-line hover:text-ink",
          )}
        >
          Все
        </Link>
        {(Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][]).map(([value, label]) => (
          <Link
            key={value}
            href={listHref(1, value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition",
              status === value
                ? "bg-brand-500 text-white"
                : "bg-surface text-ink-muted ring-1 ring-line hover:text-ink",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState>{status ? "Заявок с таким статусом нет." : "Заявок пока нет."}</EmptyState>
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

      {/* Пагинация */}
      {totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={listHref(page - 1, status)}
              className="inline-flex items-center gap-1 rounded-xl bg-surface px-4 py-2 text-sm font-semibold ring-1 ring-line hover:bg-surface-soft"
            >
              <ChevronLeft className="h-4 w-4" /> Назад
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-muted">
            Страница {page} из {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={listHref(page + 1, status)}
              className="inline-flex items-center gap-1 rounded-xl bg-surface px-4 py-2 text-sm font-semibold ring-1 ring-line hover:bg-surface-soft"
            >
              Вперёд <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </>
  );
}
