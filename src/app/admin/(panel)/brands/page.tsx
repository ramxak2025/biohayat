import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/form-controls";
import { prisma } from "@/lib/prisma";
import { deleteBrand } from "./actions";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
    take: 200,
  });

  return (
    <>
      <AdminHeader
        title="Бренды"
        description={`Всего: ${brands.length}`}
        action={
          <Button asChild>
            <Link href="/admin/brands/new"><Plus className="h-4 w-4" /> Добавить бренд</Link>
          </Button>
        }
      />

      {brands.length === 0 ? (
        <EmptyState>Бренды не найдены.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="p-4 font-semibold">Бренд</th>
                <th className="p-4 font-semibold">Страна</th>
                <th className="p-4 font-semibold">Тип</th>
                <th className="p-4 font-semibold">Товаров</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {brands.map((b) => (
                <tr key={b.id} className="hover:bg-surface-soft/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-soft">
                        {b.logo ? (
                          <Image src={b.logo} alt="" width={48} height={48} className="h-12 w-12 object-contain" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{b.name}</span>
                          {b.isFeatured ? <Pill tone="amber">В витрине</Pill> : null}
                        </div>
                        <div className="text-xs text-ink-faint">/{b.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-ink-muted">{b.country ?? "—"}</td>
                  <td className="p-4">
                    <Pill tone={b.isOwn ? "green" : "neutral"}>{b.isOwn ? "Собственный" : "Сторонний"}</Pill>
                  </td>
                  <td className="p-4 text-ink-muted">{b._count.products}</td>
                  <td className="p-4">
                    <Pill tone={b.isActive ? "green" : "neutral"}>{b.isActive ? "Активен" : "Скрыт"}</Pill>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/brands/${b.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton action={deleteBrand.bind(null, b.id)} label="" confirmText={`Удалить «${b.name}»? Товары останутся, но потеряют бренд.`} />
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
