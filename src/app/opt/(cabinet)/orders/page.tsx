import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { WholesaleOrderStatus } from "@prisma/client";
import { ArrowLeft, ChevronDown, ClipboardList } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { getB2BAccount } from "@/lib/b2b-auth";
import { prisma } from "@/lib/prisma";
import { cn, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Мои заявки — ХАЯТ Опт",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<WholesaleOrderStatus, string> = {
  NEW: "Отправлена",
  PROCESSING: "В работе",
  CONFIRMED: "Счёт выставлен",
  DONE: "Выполнена",
  CANCELLED: "Отменена",
};

/** Тон статус-чипа: NEW — мёд, в работе — info, счёт/выполнена — brand, отмена — серый. */
const STATUS_TONE: Record<WholesaleOrderStatus, string> = {
  NEW: "bg-accent-50 text-accent-700",
  PROCESSING: "bg-info/10 text-info",
  CONFIRMED: "bg-brand-50 text-brand-700",
  DONE: "bg-brand-100 text-brand-800",
  CANCELLED: "bg-surface-sunken text-ink-muted",
};

/** «1 позиция», «2 позиции», «5 позиций». */
function pluralPositions(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} позиция`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} позиции`;
  return `${n} позиций`;
}

export default async function OptOrdersPage() {
  const account = await getB2BAccount();
  if (!account) redirect("/opt/login");
  if (account.status !== "APPROVED") redirect("/opt/pending");

  const orders = await prisma.wholesaleOrder.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const dateFmt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" });

  return (
    <Container className="max-w-3xl py-6 sm:py-8">
      <Link
        href="/opt/price"
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> К прайсу
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Мои заявки</h1>
      <p className="mt-1 text-sm text-ink-muted">{account.company}</p>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-surface px-6 py-16 text-center ring-1 ring-line">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-soft">
            <ClipboardList className="h-8 w-8 text-ink-faint" />
          </span>
          <p className="mt-4 font-semibold">Заявок пока нет</p>
          <p className="mt-1 text-sm text-ink-muted">
            Соберите первую в прайс-листе — оптовые цены считаются автоматически.
          </p>
          <Button asChild size="lg" className="mt-5">
            <Link href="/opt/price">Открыть прайс</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => {
            const units = o.items.reduce((s, i) => s + i.qty, 0);
            return (
              <details
                key={o.id}
                className="group rounded-2xl bg-surface ring-1 ring-line open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1.5 p-4 [&::-webkit-details-marker]:hidden sm:p-5">
                  <div className="min-w-0">
                    <div className="tnum font-extrabold">
                      № {o.number}
                      <span className="font-semibold text-ink-muted">
                        {" "}· {pluralPositions(o.items.length)} · {units} шт ·{" "}
                        {formatMoney(o.totalKopecks)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm text-ink-faint">
                      {dateFmt.format(o.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold",
                        STATUS_TONE[o.status],
                      )}
                    >
                      {STATUS_LABELS[o.status]}
                    </span>
                    <ChevronDown className="h-4 w-4 text-ink-faint transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                <div className="border-t border-line px-4 pb-4 sm:px-5 sm:pb-5">
                  <ul className="divide-y divide-line text-sm">
                    {o.items.map((it) => (
                      <li key={it.id} className="flex justify-between gap-3 py-2">
                        <span className="min-w-0 text-ink-muted">
                          {it.name}{" "}
                          <span className="tnum whitespace-nowrap text-ink-faint">
                            × {it.qty} по {formatMoney(it.priceKopecks)}
                          </span>
                        </span>
                        <span className="tnum shrink-0 font-semibold">
                          {formatMoney(it.priceKopecks * it.qty)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {o.comment ? (
                    <p className="mt-3 rounded-xl bg-surface-soft p-3 text-sm text-ink-muted">
                      {o.comment}
                    </p>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <span className="font-bold">Итого</span>
                    <span className="tnum font-extrabold">{formatMoney(o.totalKopecks)}</span>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </Container>
  );
}
