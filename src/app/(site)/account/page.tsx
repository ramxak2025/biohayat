import type { Metadata } from "next";
import Link from "next/link";
import {
  Package, Heart, PillBottle, MapPin, FlaskConical, MessageCircleHeart, UserCog, LogOut, ChevronRight,
} from "lucide-react";
import { AuthForms } from "./auth-forms";
import { AccountShell } from "@/components/account/account-shell";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Личный кабинет — ХАЯТ",
  robots: { index: false, follow: false },
};

/** Русское склонение: plural(3, ["курс", "курса", "курсов"]) → «курса». */
function plural(n: number, [one, few, many]: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** +79991234567 → +7 (999) 123-45-67 (для отображения). */
function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").replace(/^[78]/, "");
  if (d.length !== 10) return phone;
  return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
}

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) return <AuthForms />;

  const [ordersCount, favCount, plansCount, addressesCount] = await Promise.all([
    prisma.order.count({ where: { customerId: session.sub } }),
    prisma.favorite.count({ where: { customerId: session.sub } }),
    prisma.intakePlan.count({ where: { customerId: session.sub, isActive: true } }),
    prisma.customerAddress.count({ where: { customerId: session.sub } }),
  ]);

  return (
    <AccountShell name={session.name}>
      {/* Приветствие как в приложении */}
      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xl font-extrabold text-white lg:hidden">
          {session.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">Здравствуйте, {session.name}!</h1>
          <p className="tnum mt-0.5 text-ink-muted">{formatPhone(session.phone)}</p>
        </div>
      </div>

      {/* Сетка разделов 2×N */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <SectionCard
          href="/account/orders"
          icon={Package}
          tone="bg-brand-50 text-brand-600"
          title="Заказы"
          count={ordersCount}
          hint="История и трекинг"
        />
        <SectionCard
          href="/account/favorites"
          icon={Heart}
          tone="bg-sale-soft text-sale"
          title="Избранное"
          count={favCount}
          hint="Сохранённые товары"
        />
        <SectionCard
          href="/account/intake"
          icon={PillBottle}
          tone="bg-brand-50 text-brand-600"
          title="Приём БАД"
          count={plansCount}
          hint={plural(plansCount, ["активный курс", "активных курса", "активных курсов"])}
        />
        <SectionCard
          href="/account/addresses"
          icon={MapPin}
          tone="bg-accent-50 text-accent-600"
          title="Адреса"
          count={addressesCount}
          hint="Доставка быстрее"
        />
        <SectionCard
          href="/account/consultation"
          icon={MessageCircleHeart}
          tone="bg-accent-50 text-accent-600"
          title="Консультация"
          hint="Нутрициолог на связи"
        />
        <SectionCard
          href="/account/compatibility"
          icon={FlaskConical}
          tone="bg-brand-50 text-brand-600"
          title="Совместимость"
          hint="Проверка сочетаний"
        />
        <SectionCard
          href="/account/profile"
          icon={UserCog}
          tone="bg-surface-soft text-ink-muted"
          title="Профиль"
          hint="Данные и безопасность"
        />
      </div>

      {/* Спокойный выход */}
      <form action="/account/logout" method="post" className="mt-8">
        <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 font-semibold text-sale transition hover:bg-sale-soft sm:w-auto">
          <LogOut className="h-[18px] w-[18px]" /> Выйти из аккаунта
        </button>
      </form>
    </AccountShell>
  );
}

function SectionCard({
  href, icon: Icon, tone, title, count, hint,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  count?: number;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[124px] flex-col rounded-2xl bg-surface p-4 ring-1 ring-line transition hover:shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}>
          <Icon className="h-[22px] w-[22px]" />
        </span>
        {typeof count === "number" ? (
          <span className="tnum rounded-full bg-surface-soft px-2.5 py-1 text-sm font-extrabold text-ink">
            {count}
          </span>
        ) : (
          <ChevronRight className="h-5 w-5 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink-muted" />
        )}
      </div>
      <div className="mt-auto pt-3">
        <div className="font-extrabold leading-tight">{title}</div>
        {hint ? <div className="mt-0.5 text-xs text-ink-faint">{hint}</div> : null}
      </div>
    </Link>
  );
}
