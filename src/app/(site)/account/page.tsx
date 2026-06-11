import type { Metadata } from "next";
import Link from "next/link";
import {
  Package, Heart, PillBottle, MapPin, FlaskConical, MessageCircleHeart, UserCog, LogOut, ChevronRight, Pencil, Sparkles,
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

/** Дата в формате YYYY-MM-DD (зона сервера) — как в /account/intake. */
function toDayStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) return <AuthForms />;

  const today = toDayStr(new Date());

  const [ordersCount, favCount, addressesCount, activePlans, takenTodayRaw] = await Promise.all([
    prisma.order.count({ where: { customerId: session.sub } }),
    prisma.favorite.count({ where: { customerId: session.sub } }),
    prisma.customerAddress.count({ where: { customerId: session.sub } }),
    prisma.intakePlan.findMany({
      where: { customerId: session.sub, isActive: true },
      select: { times: true, startDate: true, durationDays: true },
    }),
    prisma.intakeLog.count({
      where: { day: today, plan: { customerId: session.sub, isActive: true } },
    }),
  ]);

  const plansCount = activePlans.length;

  // Сколько приёмов запланировано на сегодня: суммируем слоты курсов,
  // чьё окно (startDate … startDate + durationDays − 1) включает сегодня.
  const todayTotal = activePlans.reduce((sum, p) => {
    const start = toDayStr(p.startDate);
    const end = p.durationDays ? toDayStr(addDays(p.startDate, p.durationDays - 1)) : null;
    return sum + (today >= start && (!end || today <= end) ? p.times.length : 0);
  }, 0);
  const takenToday = Math.min(takenTodayRaw, todayTotal);
  const progress = todayTotal > 0 ? Math.round((takenToday / todayTotal) * 100) : 0;

  return (
    <AccountShell name={session.name}>
      {/* Шапка профиля — как в нативном приложении */}
      <div className="animate-fade-up mb-5 flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-extrabold text-white shadow-brand">
          {session.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold">{session.name}</h1>
          <p className="tnum mt-0.5 text-sm text-ink-faint">{formatPhone(session.phone)}</p>
        </div>
        <Link
          href="/account/profile"
          aria-label="Редактировать профиль"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted ring-1 ring-line transition hover:text-ink active:scale-95 active:bg-surface-soft"
        >
          <Pencil className="h-[18px] w-[18px]" />
        </Link>
      </div>

      {/* Виджет дня: прогресс приёма либо промо трекера */}
      {plansCount > 0 ? (
        <Link
          href="/account/intake"
          className="animate-fade-up group relative mb-6 flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white shadow-brand transition active:scale-[0.99] sm:p-5"
          style={{ animationDelay: "60ms" }}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
            <PillBottle className="h-[22px] w-[22px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold leading-tight">
              {todayTotal > 0 ? (
                <>Приём сегодня: <span className="tnum">{takenToday} из {todayTotal}</span></>
              ) : (
                "Курсы приёма активны"
              )}
            </div>
            <div className="mt-0.5 text-xs text-white/75">
              {plansCount} {plural(plansCount, ["активный курс", "активных курса", "активных курсов"])}
            </div>
            {todayTotal > 0 && (
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/80 transition group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <Link
          href="/account/intake"
          className="animate-fade-up group mb-6 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-50 to-surface-soft p-4 ring-1 ring-line transition active:scale-[0.99] sm:p-5"
          style={{ animationDelay: "60ms" }}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Sparkles className="h-[22px] w-[22px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold leading-tight">Начните трекер приёма</div>
            <div className="mt-0.5 text-xs text-ink-muted">Напоминания и отметки приёма БАД по дням</div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink-muted" />
        </Link>
      )}

      {/* Разделы — группы-списки как в настройках iOS */}
      <div className="space-y-5">
        <SectionGroup title="Покупки" delay={120}>
          <SectionRow href="/account/orders" icon={Package} tone="bg-brand-50 text-brand-600" title="Мои заказы" count={ordersCount} />
          <SectionRow href="/account/favorites" icon={Heart} tone="bg-sale-soft text-sale" title="Избранное" count={favCount} />
          <SectionRow href="/account/addresses" icon={MapPin} tone="bg-accent-50 text-accent-700" title="Мои адреса" count={addressesCount} />
        </SectionGroup>

        <SectionGroup title="Здоровье" delay={180}>
          <SectionRow href="/account/intake" icon={PillBottle} tone="bg-brand-50 text-brand-600" title="Приём БАД" count={plansCount} />
          <SectionRow href="/account/compatibility" icon={FlaskConical} tone="bg-brand-50 text-brand-600" title="Совместимость" />
          <SectionRow href="/account/consultation" icon={MessageCircleHeart} tone="bg-accent-50 text-accent-700" title="Консультация" />
        </SectionGroup>

        <SectionGroup title="Аккаунт" delay={240}>
          <SectionRow href="/account/profile" icon={UserCog} tone="bg-surface-soft text-ink-muted" title="Профиль и данные" />
        </SectionGroup>
      </div>

      {/* Спокойный выход */}
      <form action="/account/logout" method="post" className="animate-fade-up mt-8 text-center" style={{ animationDelay: "300ms" }}>
        <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold text-sale transition hover:bg-sale-soft active:scale-[0.98]">
          <LogOut className="h-[18px] w-[18px]" /> Выйти из аккаунта
        </button>
      </form>
    </AccountShell>
  );
}

function SectionGroup({
  title, delay, children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-faint">{title}</h2>
      <div className="overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-line divide-y divide-line">
        {children}
      </div>
    </section>
  );
}

function SectionRow({
  href, icon: Icon, tone, title, count,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-14 items-center gap-3 px-4 py-2.5 transition active:scale-[0.99] active:bg-surface-soft"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
      {typeof count === "number" && (
        <span className="tnum shrink-0 rounded-full bg-surface-soft px-2.5 py-1 text-xs font-extrabold text-ink-muted">
          {count}
        </span>
      )}
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink-muted" />
    </Link>
  );
}
