import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form-controls";
import { prisma } from "@/lib/prisma";
import { cn, formatMoney } from "@/lib/utils";
import {
  ModerationButtons,
  AccountStatusSelect,
  WholesaleOrderStatusSelect,
  ACCOUNT_STATUS_LABELS,
  WHOLESALE_ORDER_STATUS_LABELS,
} from "./wholesale-controls";
import { deleteWholesaleAccount, deleteWholesaleOrder } from "./actions";
import type { WholesaleStatus, WholesaleOrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ACCOUNT_TONE: Record<WholesaleStatus, "amber" | "green" | "red"> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

// NEW — жёлтый (accent), PROCESSING — синий (info), CONFIRMED/DONE — зелёные, CANCELLED — серый
const ORDER_TONE: Record<WholesaleOrderStatus, "amber" | "blue" | "green" | "neutral"> = {
  NEW: "amber",
  PROCESSING: "blue",
  CONFIRMED: "green",
  DONE: "green",
  CANCELLED: "neutral",
};

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function chipClass(active: boolean): string {
  return cn(
    "rounded-full px-4 py-1.5 text-sm font-semibold transition",
    active ? "bg-brand-500 text-white" : "bg-surface text-ink-muted ring-1 ring-line hover:text-ink",
  );
}

export default async function WholesalePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "orders" ? "orders" : "accounts";
  const pendingCount = await prisma.wholesaleAccount.count({ where: { status: "PENDING" } });

  return (
    <>
      <AdminHeader
        title="Опт"
        description="Оптовые покупатели и их заявки · opt.biohayat.ru"
        action={pendingCount > 0 ? <Pill tone="amber">На проверке: {pendingCount}</Pill> : undefined}
      />

      {/* Табы раздела */}
      <div className="mb-5 flex gap-2 border-b border-line pb-4">
        <Link href="/admin/wholesale" className={chipClass(tab === "accounts")}>
          Аккаунты{pendingCount > 0 ? ` · ${pendingCount}` : ""}
        </Link>
        <Link href="/admin/wholesale?tab=orders" className={chipClass(tab === "orders")}>
          Заявки
        </Link>
      </div>

      {tab === "accounts" ? (
        <AccountsTab rawStatus={sp.status} pendingCount={pendingCount} />
      ) : (
        <OrdersTab />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
//  Таб «Аккаунты»: модерация оптовиков
// ─────────────────────────────────────────────
async function AccountsTab({
  rawStatus,
  pendingCount,
}: {
  rawStatus?: string;
  pendingCount: number;
}) {
  const status: WholesaleStatus | undefined =
    rawStatus === "all"
      ? undefined
      : rawStatus === "APPROVED" || rawStatus === "REJECTED"
        ? rawStatus
        : "PENDING";

  const accounts = await prisma.wholesaleAccount.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
  });

  const chips: { label: string; value: string; active: boolean }[] = [
    { label: `На проверке (${pendingCount})`, value: "PENDING", active: status === "PENDING" },
    { label: "Одобренные", value: "APPROVED", active: status === "APPROVED" },
    { label: "Отклонённые", value: "REJECTED", active: status === "REJECTED" },
    { label: "Все", value: "all", active: !status },
  ];

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {chips.map((c) => (
          <Link
            key={c.value}
            href={`/admin/wholesale?status=${c.value}`}
            className={chipClass(c.active)}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {accounts.length === 0 ? (
        <EmptyState>
          {status === "PENDING"
            ? "Новых заявок на оптовый доступ нет."
            : "Аккаунтов с таким статусом нет."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-bold">{a.company}</div>
                  <div className="text-sm text-ink-muted">{a.name}</div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Pill tone={ACCOUNT_TONE[a.status]}>{ACCOUNT_STATUS_LABELS[a.status]}</Pill>
                  {!a.isActive ? <Pill>Отключён</Pill> : null}
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div>
                  <a href={`tel:${a.phone}`} className="font-semibold text-brand-700 hover:underline">
                    {a.phone}
                  </a>
                </div>
                {a.inn ? <div className="text-ink-muted">ИНН: {a.inn}</div> : null}
                {a.city ? <div className="text-ink-muted">Город: {a.city}</div> : null}
              </div>

              {a.comment ? (
                <p className="whitespace-pre-line rounded-xl bg-surface-soft px-3.5 py-2.5 text-sm text-ink-muted">
                  {a.comment}
                </p>
              ) : null}

              <div className="text-xs text-ink-faint">Заявка от {formatDate(a.createdAt)}</div>

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
                {a.status === "PENDING" ? (
                  <ModerationButtons id={a.id} />
                ) : (
                  <AccountStatusSelect id={a.id} status={a.status} />
                )}
                <div className="ml-auto">
                  <DeleteButton
                    action={deleteWholesaleAccount.bind(null, a.id)}
                    label=""
                    confirmText={`Удалить аккаунт «${a.company}» вместе с его заявками?`}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
//  Таб «Заявки»: оптовые заказы
// ─────────────────────────────────────────────
async function OrdersTab() {
  const orders = await prisma.wholesaleOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { company: true, phone: true } },
      items: true,
    },
  });

  if (orders.length === 0) {
    return <EmptyState>Оптовых заявок пока нет.</EmptyState>;
  }

  return (
    <Card className="divide-y divide-line p-0">
      {orders.map((o) => {
        const units = o.items.reduce((sum, it) => sum + it.qty, 0);
        return (
          <details key={o.id} className="group">
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1.5 p-4 hover:bg-surface-soft/50 [&::-webkit-details-marker]:hidden">
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition group-open:rotate-90" />
              <span className="w-14 shrink-0 font-bold text-brand-700">№{o.number}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{o.account.company}</span>
                <a
                  href={`tel:${o.account.phone}`}
                  className="text-xs text-ink-faint hover:text-brand-700 hover:underline"
                >
                  {o.account.phone}
                </a>
              </span>
              <span className="hidden text-sm text-ink-muted sm:block">
                {o.items.length} поз. · {units} шт
              </span>
              <span className="tnum font-bold">{formatMoney(o.totalKopecks)}</span>
              <Pill tone={ORDER_TONE[o.status]}>{WHOLESALE_ORDER_STATUS_LABELS[o.status]}</Pill>
              <span className="text-xs text-ink-faint">{formatDate(o.createdAt)}</span>
            </summary>

            <div className="space-y-4 border-t border-line bg-surface-soft/40 p-4 pl-12">
              <table className="w-full max-w-2xl text-sm">
                <thead className="text-left text-xs uppercase text-ink-faint">
                  <tr>
                    <th className="pb-2 font-semibold">Товар</th>
                    <th className="pb-2 text-right font-semibold">Кол-во</th>
                    <th className="pb-2 text-right font-semibold">Цена/шт</th>
                    <th className="pb-2 text-right font-semibold">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {o.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 pr-3">{it.name}</td>
                      <td className="tnum py-2 text-right">{it.qty} шт</td>
                      <td className="tnum py-2 text-right">{formatMoney(it.priceKopecks)}</td>
                      <td className="tnum py-2 text-right font-semibold">
                        {formatMoney(it.priceKopecks * it.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {o.comment ? (
                <p className="max-w-2xl whitespace-pre-line rounded-xl bg-surface px-3.5 py-2.5 text-sm text-ink-muted ring-1 ring-line">
                  {o.comment}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <WholesaleOrderStatusSelect id={o.id} status={o.status} />
                <DeleteButton
                  action={deleteWholesaleOrder.bind(null, o.id)}
                  label=""
                  confirmText={`Удалить заявку №${o.number}?`}
                />
              </div>
            </div>
          </details>
        );
      })}
    </Card>
  );
}
