import type { Metadata } from "next";
import { ListLink as Link } from "@/components/ui/list-link";
import {
  Package, Heart, PillBottle, MapPin, FlaskConical, MessageCircleHeart, UserCog, LogOut, ChevronRight, Pencil, Sparkles, Coins, Gift,
} from "lucide-react";
import { AuthForms } from "./auth-forms";
import { AccountShell } from "@/components/account/account-shell";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";

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

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCustomerSession();
  if (!session) {
    // Обработчики /account/login и /account/register возвращают сюда код ошибки.
    const sp = await searchParams;
    const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
    return (
      <AuthForms
        defaultTab={one("tab") === "register" ? "register" : "login"}
        error={one("error")}
        retryMin={one("min")}
      />
    );
  }

  const today = toDayStr(new Date());

  const [ordersCount, favCount, addressesCount, activePlans, takenTodayRaw, customer] = await Promise.all([
    prisma.order.count({ where: { customerId: session.sub } }),
    prisma.favorite.count({ where: { customerId: session.sub } }),
    prisma.customerAddress.count({ where: { customerId: session.sub } }),
    prisma.intakePlan.findMany({
      where: { customerId: session.sub, isActive: true },
      select: {
        id: true,
        times: true,
        startDate: true,
        durationDays: true,
        product: { select: { name: true, slug: true, volume: true } },
      },
    }),
    prisma.intakeLog.count({
      where: { day: today, plan: { customerId: session.sub, isActive: true } },
    }),
    prisma.customer.findUnique({
      where: { id: session.sub },
      select: { bonusKopecks: true },
    }),
  ]);

  const plansCount = activePlans.length;
  const bonusKopecks = customer?.bonusKopecks ?? 0;

  // Сколько приёмов запланировано на сегодня: суммируем слоты курсов,
  // чьё окно (startDate … startDate + durationDays − 1) включает сегодня.
  const todayTotal = activePlans.reduce((sum, p) => {
    const start = toDayStr(p.startDate);
    const end = p.durationDays ? toDayStr(addDays(p.startDate, p.durationDays - 1)) : null;
    return sum + (today >= start && (!end || today <= end) ? p.times.length : 0);
  }, 0);
  const takenToday = Math.min(takenTodayRaw, todayTotal);
  const progress = todayTotal > 0 ? Math.round((takenToday / todayTotal) * 100) : 0;

  // «Банка заканчивается»: ёмкость берём из product.volume («60 капсул» → 60),
  // расход в день — число слотов курса, принято — все отметки IntakeLog по плану.
  const capacityRe = /(\d{2,4})\s*(капс|табл|шт)/i;
  const candidates = activePlans.filter(
    (p) => p.product && p.times.length > 0 && capacityRe.test(p.product.volume ?? ""),
  );
  let runningOut: { name: string; slug: string; daysLeft: number }[] = [];
  if (candidates.length > 0) {
    const takenByPlan = await prisma.intakeLog.groupBy({
      by: ["planId"],
      where: { planId: { in: candidates.map((p) => p.id) } },
      _count: { _all: true },
    });
    const takenMap = new Map(takenByPlan.map((g) => [g.planId, g._count._all]));
    runningOut = candidates
      .flatMap((p) => {
        const capacity = Number(capacityRe.exec(p.product!.volume!)![1]);
        const perDay = p.times.length;
        const left = capacity - (takenMap.get(p.id) ?? 0);
        const daysLeft = Math.floor(left / perDay);
        if (daysLeft > 7 || daysLeft <= -1) return [];
        return [{ name: p.product!.name, slug: p.product!.slug, daysLeft }];
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 2);
  }

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
          <Link
            href="/account/bonuses"
            className="tnum mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-bold text-accent-700 ring-1 ring-line transition hover:bg-accent-100 active:scale-[0.97]"
          >
            🪙 {formatMoney(bonusKopecks)} бонусов
          </Link>
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

      {/* «Банка заканчивается»: прогноз по активным курсам с привязанным товаром */}
      {runningOut.length > 0 && (
        <div className="animate-fade-up mb-6 space-y-3" style={{ animationDelay: "90ms" }}>
          {runningOut.map((r) => (
            <div
              key={r.slug}
              className="flex items-center gap-4 rounded-2xl bg-accent-50 p-4 shadow-xs ring-1 ring-line sm:p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                <PillBottle className="h-[22px] w-[22px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-extrabold leading-tight">{r.name}</div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  {r.daysLeft <= 0
                    ? "Заканчивается со дня на день"
                    : `Закончится через ~${r.daysLeft} ${plural(r.daysLeft, ["день", "дня", "дней"])}`}
                </div>
              </div>
              <Link
                href={`/product/${r.slug}`}
                className="shrink-0 rounded-full bg-surface px-4 py-2.5 text-sm font-bold text-accent-700 ring-1 ring-line transition hover:bg-accent-100 active:scale-[0.97]"
              >
                Заказать ещё
              </Link>
            </div>
          ))}
        </div>
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

        <SectionGroup title="Бонусы и друзья" delay={240}>
          <SectionRow href="/account/bonuses" icon={Coins} tone="bg-accent-50 text-accent-700" title="Бонусные баллы" count={Math.round(bonusKopecks / 100)} />
          <SectionRow href="/account/referral" icon={Gift} tone="bg-brand-50 text-brand-600" title="Пригласить друга — 300 ₽" />
        </SectionGroup>

        <SectionGroup title="Аккаунт" delay={300}>
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
