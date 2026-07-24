import type { Metadata } from "next";
import Link from "next/link";
import { Package, Heart, PillBottle, ArrowRight, Gift, Sparkles } from "lucide-react";
import { AuthForms } from "./auth-forms";
import { AccountShell } from "@/components/account/account-shell";
import { ProductGrid } from "@/components/product/product-card";
import { getCustomerSession } from "@/lib/customer-auth";
import { getProducts } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Личный кабинет — ХАЯТ",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) return <AuthForms />;

  const [customer, ordersCount, favCount, plansCount, lastOrders, activePlans, orderItems] = await Promise.all([
    prisma.customer.findUnique({ where: { id: session.sub }, select: { bonusBalance: true } }),
    prisma.order.count({ where: { customerId: session.sub } }),
    prisma.favorite.count({ where: { customerId: session.sub } }),
    prisma.intakePlan.count({ where: { customerId: session.sub, isActive: true } }),
    prisma.order.findMany({ where: { customerId: session.sub }, orderBy: { createdAt: "desc" }, take: 3 }),
    // Активные курсы с привязкой к товарам — для подбора целей рекомендаций.
    prisma.intakePlan.findMany({
      where: { customerId: session.sub, isActive: true, productId: { not: null } },
      select: { product: { select: { goals: true } } },
    }),
    // Товары, которые клиент уже заказывал — исключаем из рекомендаций.
    prisma.orderItem.findMany({
      where: { order: { customerId: session.sub }, productId: { not: null } },
      select: { productId: true },
    }),
  ]);

  // Цели из активных курсов; берём первую как ориентир для подбора.
  const goals = Array.from(new Set(activePlans.flatMap((p) => p.product?.goals ?? [])));
  const orderedIds = new Set(orderItems.map((i) => i.productId).filter(Boolean) as string[]);

  // Подбираем рекомендации: по цели активного курса, иначе — рекомендуемые товары.
  const recRaw = await getProducts(goals.length ? { goal: goals[0], take: 12 } : { featured: true, take: 12 });
  const recommendations = recRaw.items.filter((p) => !orderedIds.has(p.id)).slice(0, 5);
  const bonusBalance = customer?.bonusBalance ?? 0;

  return (
    <AccountShell name={session.name}>
      <h1 className="mb-1 text-2xl font-extrabold">Здравствуйте, {session.name}!</h1>
      <p className="mb-6 text-ink-muted">Добро пожаловать в личный кабинет ХАЯТ.</p>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat href="/account/orders" icon={Package} label="Заказов" value={ordersCount} />
        <Stat href="/account/favorites" icon={Heart} label="В избранном" value={favCount} />
        <Stat href="/account/intake" icon={PillBottle} label="Курсов приёма" value={plansCount} />
      </div>

      {/* Бонусы */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-5 text-white ring-1 ring-brand-500">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
            <Gift className="h-6 w-6" />
          </span>
          <div>
            <div className="text-sm font-medium text-white/80">Бонусный счёт</div>
            <div className="text-2xl font-extrabold">{bonusBalance} {bonusBalance === 1 ? "балл" : bonusBalance >= 2 && bonusBalance <= 4 ? "балла" : "баллов"}</div>
          </div>
        </div>
        <p className="max-w-xs text-sm text-white/80">
          1 балл = 1 ₽. Начисляем за покупки и активность, списываем при оформлении заказа.
        </p>
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

      {/* Рекомендации */}
      {recommendations.length > 0 ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-500" />
            <h2 className="font-bold">Рекомендуем вам</h2>
          </div>
          <ProductGrid products={recommendations} reveal={false} />
        </div>
      ) : null}

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
