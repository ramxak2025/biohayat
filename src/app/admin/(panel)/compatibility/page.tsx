import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import type { CompatibilityType } from "@prisma/client";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/form-controls";
import { prisma } from "@/lib/prisma";
import { deleteRule } from "./actions";
import { TYPE_LABELS } from "./rule-form";

export const dynamic = "force-dynamic";

// Цветовая схема Pill по типу совместимости
const TYPE_TONE: Record<CompatibilityType, "green" | "red" | "amber"> = {
  SYNERGY: "green",
  ANTAGONIST: "red",
  CAUTION: "amber",
};

export default async function CompatibilityPage() {
  const rules = await prisma.compatibilityRule.findMany({
    orderBy: { componentA: "asc" },
    take: 500,
  });

  return (
    <>
      <AdminHeader
        title="Совместимость БАД"
        description={`Всего правил: ${rules.length}`}
        action={
          <Button asChild>
            <Link href="/admin/compatibility/new"><Plus className="h-4 w-4" /> Добавить правило</Link>
          </Button>
        }
      />

      {rules.length === 0 ? (
        <EmptyState>Правила совместимости не найдены.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="p-4 font-semibold">Компоненты</th>
                <th className="p-4 font-semibold">Тип</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-surface-soft/50">
                  <td className="p-4">
                    <div className="font-semibold">
                      {r.componentA} <span className="text-ink-faint">+</span> {r.componentB}
                    </div>
                    {r.note ? (
                      <div className="mt-0.5 line-clamp-1 text-xs text-ink-faint">{r.note}</div>
                    ) : null}
                  </td>
                  <td className="p-4">
                    <Pill tone={TYPE_TONE[r.type]}>{TYPE_LABELS[r.type]}</Pill>
                  </td>
                  <td className="p-4">
                    <Pill tone={r.isActive ? "green" : "neutral"}>{r.isActive ? "Активно" : "Скрыто"}</Pill>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/compatibility/${r.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton
                        action={deleteRule.bind(null, r.id)}
                        label=""
                        confirmText={`Удалить правило «${r.componentA} + ${r.componentB}»?`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
