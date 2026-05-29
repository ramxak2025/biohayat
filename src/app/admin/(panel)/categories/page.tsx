import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/form-controls";
import { prisma } from "@/lib/prisma";
import { deleteCategory } from "./actions";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
    take: 200,
  });

  return (
    <>
      <AdminHeader
        title="Категории"
        description={`Всего: ${categories.length}`}
        action={
          <Button asChild>
            <Link href="/admin/categories/new"><Plus className="h-4 w-4" /> Добавить категорию</Link>
          </Button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState>Категории не найдены.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="p-4 font-semibold">Категория</th>
                <th className="p-4 font-semibold">Товаров</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-surface-soft/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-soft">
                        {c.image ? (
                          <Image src={c.image} alt="" width={48} height={48} className="h-12 w-12 object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-ink-faint">/{c.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-ink-muted">{c._count.products}</td>
                  <td className="p-4">
                    <Pill tone={c.isActive ? "green" : "neutral"}>{c.isActive ? "Активна" : "Скрыта"}</Pill>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/categories/${c.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton action={deleteCategory.bind(null, c.id)} label="" confirmText={`Удалить «${c.name}»?`} />
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
