import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { TogglePromoButton } from "./promo-controls";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short" });

export default async function PromoCodesPage() {
  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const now = new Date();

  return (
    <>
      <AdminHeader
        title="Промокоды"
        description={`Всего: ${promos.length}`}
        action={
          <Button asChild>
            <Link href="/admin/promocodes/new"><Plus className="h-4 w-4" /> Добавить промокод</Link>
          </Button>
        }
      />

      {promos.length === 0 ? (
        <EmptyState>Промокоды не найдены.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[840px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="p-4 font-semibold">Код</th>
                <th className="p-4 font-semibold">Скидка</th>
                <th className="p-4 font-semibold">Мин. сумма</th>
                <th className="p-4 font-semibold">Использовано</th>
                <th className="p-4 font-semibold">Срок</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {promos.map((p) => {
                const expired = p.expiresAt ? p.expiresAt < now : false;
                const exhausted = p.usageLimit != null && p.usedCount >= p.usageLimit;
                return (
                  <tr key={p.id} className="hover:bg-surface-soft/50">
                    <td className="p-4">
                      <Link href={`/admin/promocodes/${p.id}`} className="font-bold text-brand-700 hover:underline">
                        {p.code}
                      </Link>
                      {p.description ? (
                        <div className="mt-0.5 line-clamp-1 text-xs text-ink-faint">{p.description}</div>
                      ) : null}
                    </td>
                    <td className="p-4 font-semibold">
                      {p.discountType === "PERCENT" ? `${p.value}%` : formatMoney(p.value)}
                    </td>
                    <td className="p-4 text-ink-muted">
                      {p.minOrderKopecks > 0 ? formatMoney(p.minOrderKopecks) : "—"}
                    </td>
                    <td className="p-4 text-ink-muted">
                      {p.usedCount}{p.usageLimit != null ? ` / ${p.usageLimit}` : ""}
                      {exhausted ? <Pill tone="red">Исчерпан</Pill> : null}
                    </td>
                    <td className="p-4 text-ink-muted">
                      {p.expiresAt ? (
                        <span className={expired ? "text-danger" : undefined}>
                          до {dateFmt.format(p.expiresAt)}
                        </span>
                      ) : (
                        "бессрочно"
                      )}
                    </td>
                    <td className="p-4">
                      <Pill tone={p.isActive && !expired && !exhausted ? "green" : "neutral"}>
                        {p.isActive ? (expired ? "Истёк" : exhausted ? "Исчерпан" : "Активен") : "Выключен"}
                      </Pill>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/admin/promocodes/${p.id}`}><Pencil className="h-4 w-4" /></Link>
                        </Button>
                        <TogglePromoButton id={p.id} isActive={p.isActive} />
                      </div>
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
