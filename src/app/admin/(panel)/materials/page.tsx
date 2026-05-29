import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/form-controls";
import { prisma } from "@/lib/prisma";
import { deleteMaterial } from "./actions";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const materials = await prisma.material.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <AdminHeader
        title="Материалы"
        description={`Всего: ${materials.length}`}
        action={
          <Button asChild>
            <Link href="/admin/materials/new"><Plus className="h-4 w-4" /> Добавить материал</Link>
          </Button>
        }
      />

      {materials.length === 0 ? (
        <EmptyState>Материалы не найдены.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="p-4 font-semibold">Материал</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {materials.map((m) => (
                <tr key={m.id} className="hover:bg-surface-soft/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-soft">
                        {m.coverImage ? (
                          <Image src={m.coverImage} alt="" width={80} height={48} className="h-12 w-20 object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold">{m.title}</div>
                        <div className="text-xs text-ink-faint">/{m.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Pill tone={m.isPublished ? "green" : "neutral"}>{m.isPublished ? "Опубликован" : "Черновик"}</Pill>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/materials/${m.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton action={deleteMaterial.bind(null, m.id)} label="" confirmText={`Удалить «${m.title}»?`} />
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
