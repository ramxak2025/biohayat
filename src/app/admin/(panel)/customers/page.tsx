import Link from "next/link";
import { Eye } from "lucide-react";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" });

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    include: { _count: { select: { orders: true, favorites: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <>
      <AdminHeader title="Клиенты" description={`Всего: ${customers.length}`} />

      {customers.length === 0 ? (
        <EmptyState>Клиенты не найдены.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="p-4 font-semibold">Клиент</th>
                <th className="p-4 font-semibold">Телефон</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Заказов</th>
                <th className="p-4 font-semibold">В избранном</th>
                <th className="p-4 font-semibold">Регистрация</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-surface-soft/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.name}</span>
                      {!c.isActive ? <Pill tone="neutral">Заблокирован</Pill> : null}
                    </div>
                  </td>
                  <td className="p-4 text-ink-muted">{c.phone}</td>
                  <td className="p-4 text-ink-muted">{c.email || "—"}</td>
                  <td className="p-4 text-ink-muted">{c._count.orders}</td>
                  <td className="p-4 text-ink-muted">{c._count.favorites}</td>
                  <td className="p-4 text-ink-muted">{dateFmt.format(c.createdAt)}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/customers/${c.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
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
