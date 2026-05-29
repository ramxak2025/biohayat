import type { Metadata } from "next";
import Link from "next/link";
import { Package, Heart, PillBottle, ArrowRight } from "lucide-react";
import { AuthForms } from "./auth-forms";
import { AccountShell } from "@/components/account/account-shell";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Личный кабинет — ХАЯТ",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) return <AuthForms />;

  const [ordersCount, favCount, plansCount, lastOrders] = await Promise.all([
    prisma.order.count({ where: { customerId: session.sub } }),
    prisma.favorite.count({ where: { customerId: session.sub } }),
    prisma.intakePlan.count({ where: { customerId: session.sub, isActive: true } }),
    prisma.order.findMany({ where: { customerId: session.sub }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  return (
    <AccountShell name={session.name}>
      <h1 className="mb-1 text-2xl font-extrabold">Здравствуйте, {session.name}!</h1>
      <p className="mb-6 text-ink-muted">Добро пожаловать в личный кабинет ХАЯТ.</p>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat href="/account/orders" icon={Package} label="Заказов" value={ordersCount} />
        <Stat href="/account/favorites" icon={Heart} label="В избранном" value={favCount} />
        <Stat href="/account/intake" icon={PillBottle} label="Курсов приёма" value={plansCount} />
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-5 ring-1 ring-line">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Последние заказы</h2>
          <Link href="/account/orders" className="text-sm font-semibold text-brand-700 hover:underline">Все →</Link>
        </div>
        {lastOrders.length === 0 ? (
          <p className="text-sm text-ink-muted">Заказов пока нет. <Link href="/catalog" className="text-brand-700 underline">Перейти в каталог</Link></p>
        ) : (
          <ul className="divide-y divide-line">
            {lastOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-semibold">№{o.number}</span>
                <span className="text-ink-muted">{new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(o.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/account/consultation" className="inline-flex items-center gap-2 rounded-full bg-accent-400 px-5 py-3 font-semibold text-white hover:bg-accent-500">
          Получить консультацию нутрициолога <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </AccountShell>
  );
}

function Stat({
  href, icon: Icon, label, value,
}: {
  href: string; icon: React.ComponentType<{ className?: string }>; label: string; value: number;
}) {
  return (
    <Link href={href} className="rounded-2xl bg-surface p-4 ring-1 ring-line transition hover:shadow-sm">
      <Icon className="h-6 w-6 text-brand-500" />
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-ink-muted">{label}</div>
    </Link>
  );
}
