import Link from "next/link";
import { Package, FolderTree, ClipboardList, Plus, AlertTriangle } from "lucide-react";
import { AdminHeader, Card, StatCard, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const [products, categories, orders, newOrders, recent, settings] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "NEW" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    getSettings(),
  ]);

  const bitrixOff = !settings.bitrixEnabled || !settings.bitrixWebhookUrl;

  return (
    <>
      <AdminHeader
        title={`Здравствуйте!`}
        description="Обзор магазина и быстрые действия"
        action={
          <Button asChild>
            <Link href="/admin/products/new"><Plus className="h-4 w-4" /> Добавить товар</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Товаров" value={products} href="/admin/products" />
        <StatCard label="Категорий" value={categories} href="/admin/categories" />
        <StatCard label="Всего заявок" value={orders} href="/admin/orders" />
        <StatCard label="Новых заявок" value={newOrders} href="/admin/orders" accent />
      </div>

      {bitrixOff ? (
        <Card className="mt-6 flex items-start gap-3 border-l-4 border-l-accent-400">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />
          <div>
            <div className="font-bold">Интеграция с Битрикс24 не настроена</div>
            <p className="text-sm text-ink-muted">
              Заявки сохраняются в базе, но не отправляются в CRM. Укажите вебхук в настройках.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href="/admin/settings">Настроить Битрикс24</Link>
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Последние заявки</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-brand-700 hover:underline">
              Все заявки →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-ink-muted">Заявок пока нет.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-brand-700">
                      №{o.number} · {o.customerName}
                    </Link>
                    <div className="text-xs text-ink-faint">{o.phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatMoney(o.totalKopecks)}</div>
                    <Pill tone={o.status === "NEW" ? "amber" : "green"}>{o.status}</Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-bold">Быстрые действия</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickLink href="/admin/products/new" icon={Package} label="Новый товар" />
            <QuickLink href="/admin/categories/new" icon={FolderTree} label="Новая категория" />
            <QuickLink href="/admin/banners/new" icon={Plus} label="Новый баннер" />
            <QuickLink href="/admin/orders" icon={ClipboardList} label="Заявки" />
          </div>
        </Card>
      </div>
    </>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl bg-surface-soft p-4 text-center text-sm font-semibold transition hover:bg-brand-50 hover:text-brand-700"
    >
      <Icon className="h-6 w-6" />
      {label}
    </Link>
  );
}
