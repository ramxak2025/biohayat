import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Search } from "lucide-react";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/form-controls";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { deleteProduct } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await prisma.product.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    include: { category: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <AdminHeader
        title="Товары"
        description={`Всего: ${products.length}`}
        action={
          <Button asChild>
            <Link href="/admin/products/new"><Plus className="h-4 w-4" /> Добавить товар</Link>
          </Button>
        }
      />

      <form className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск по названию…"
          className="h-11 w-full rounded-full border border-line bg-surface pl-11 pr-4 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </form>

      {products.length === 0 ? (
        <EmptyState>Товары не найдены.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="p-4 font-semibold">Товар</th>
                <th className="p-4 font-semibold">Категория</th>
                <th className="p-4 font-semibold">Цена</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-surface-soft/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-soft">
                        {p.images[0] ? (
                          <Image src={p.images[0].url} alt="" width={48} height={48} className="h-12 w-12 object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-ink-faint">/{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-ink-muted">{p.category.name}</td>
                  <td className="p-4">
                    <div className="font-bold">{formatMoney(p.priceKopecks)}</div>
                    {p.oldPriceKopecks ? (
                      <div className="text-xs text-ink-faint line-through">{formatMoney(p.oldPriceKopecks)}</div>
                    ) : null}
                  </td>
                  <td className="p-4">
                    <Pill tone={p.isActive ? "green" : "neutral"}>{p.isActive ? "Активен" : "Скрыт"}</Pill>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/products/${p.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton action={deleteProduct.bind(null, p.id)} label="" confirmText={`Удалить «${p.name}»?`} />
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
