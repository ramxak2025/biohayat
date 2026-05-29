import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/form-controls";
import { prisma } from "@/lib/prisma";
import { deleteBanner } from "./actions";

export const dynamic = "force-dynamic";

const PLACEMENT_LABELS: Record<string, string> = {
  HERO: "Главный слайдер",
  HOME_STRIP: "Промо-полоса",
  CATEGORY: "Каталог",
  SIDEBAR: "Боковой блок",
  POPUP: "Всплывающий",
};

export default async function BannersPage() {
  const banners = await prisma.banner.findMany({
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }],
    take: 200,
  });

  return (
    <>
      <AdminHeader
        title="Баннеры"
        description={`Всего: ${banners.length}`}
        action={
          <Button asChild>
            <Link href="/admin/banners/new"><Plus className="h-4 w-4" /> Добавить баннер</Link>
          </Button>
        }
      />

      {banners.length === 0 ? (
        <EmptyState>Баннеры не найдены.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="p-4 font-semibold">Баннер</th>
                <th className="p-4 font-semibold">Размещение</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {banners.map((b) => (
                <tr key={b.id} className="hover:bg-surface-soft/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-soft">
                        {b.image ? (
                          <Image src={b.image} alt="" width={80} height={48} className="h-12 w-20 object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold">{b.title}</div>
                        {b.subtitle ? <div className="text-xs text-ink-faint">{b.subtitle}</div> : null}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-ink-muted">{PLACEMENT_LABELS[b.placement] ?? b.placement}</td>
                  <td className="p-4">
                    <Pill tone={b.isActive ? "green" : "neutral"}>{b.isActive ? "Активен" : "Скрыт"}</Pill>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/banners/${b.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton action={deleteBanner.bind(null, b.id)} label="" confirmText={`Удалить «${b.title}»?`} />
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
