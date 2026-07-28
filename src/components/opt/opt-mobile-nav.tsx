"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Package, ClipboardList, Phone, Store, LogIn, Sparkles, Home,
} from "lucide-react";
import { useB2BCart } from "@/components/opt/b2b-cart-provider";
import { cn } from "@/lib/utils";

/**
 * Нижний бар оптового раздела (мобайл) — тот же фирменный «остров» .glass,
 * что и в рознице, но с B2B-вкладками.
 *
 * Одобренный партнёр: Прайс · Мои заявки · [Заявка, счётчик позиций] ·
 * Менеджер (звонок) · Розница. Гость: Главная · Войти · [Получить прайс] ·
 * Менеджер · Розница.
 */
export function OptMobileNav({
  loggedIn,
  approved,
  phone,
  retailUrl,
}: {
  loggedIn: boolean;
  approved: boolean;
  phone: string;
  retailUrl: string;
}) {
  const pathname = usePathname();
  const { count } = useB2BCart();
  const tel = `tel:${phone.replace(/[^\d+]/g, "")}`;

  // Пути без префикса /opt — на поддомене их добавляет rewrite,
  // а при локальном заходе через /opt/... pathname уже содержит префикс.
  const is = (p: string) => pathname === p || pathname === `/opt${p}` || pathname.startsWith(`/opt${p}/`) || pathname.startsWith(`${p}/`);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto mx-auto flex w-full max-w-[460px] items-end justify-around glass rounded-[26px] px-1.5 py-1 shadow-[0_8px_28px_rgba(26,29,26,0.14)] ring-1 ring-black/[0.05]">
        {approved ? (
          <>
            <Tab href="/opt/price" label="Прайс" icon={LayoutGrid} active={is("/price")} />
            <Tab href="/opt/orders" label="Заявки" icon={Package} active={is("/orders")} />
            <Center href="/opt/request" label="Заявка" icon={ClipboardList} active={is("/request")} badge={count} />
            <TabA href={tel} label="Менеджер" icon={Phone} />
            <TabA href={retailUrl} label="Розница" icon={Store} />
          </>
        ) : (
          <>
            <Tab href="/opt" label="Главная" icon={Home} active={pathname === "/opt" || pathname === "/"} />
            <Tab
              href={loggedIn ? "/opt/pending" : "/opt/login"}
              label={loggedIn ? "Статус" : "Войти"}
              icon={LogIn}
              active={is("/login") || is("/pending")}
            />
            <Center href="/opt/register" label="Прайс" icon={Sparkles} active={is("/register")} />
            <TabA href={tel} label="Менеджер" icon={Phone} />
            <TabA href={retailUrl} label="Розница" icon={Store} />
          </>
        )}
      </div>
    </nav>
  );
}

function Tab({
  href, label, icon: Icon, active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[50px] flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-transform duration-100 active:scale-90",
        active ? "text-brand-700" : "text-ink-faint",
      )}
    >
      <span
        className={cn(
          "flex h-[26px] w-[46px] items-center justify-center rounded-full transition-colors duration-150",
          active && "bg-brand-50",
        )}
      >
        <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 1.9} />
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}

/** Внешняя/tel-ссылка тем же стилем (без active-состояния). */
function TabA({
  href, label, icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex min-h-[50px] flex-1 flex-col items-center justify-center gap-1 py-1.5 text-ink-faint transition-transform duration-100 active:scale-90"
    >
      <span className="flex h-[26px] w-[46px] items-center justify-center rounded-full">
        <Icon className="h-[21px] w-[21px]" strokeWidth={1.9} />
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </a>
  );
}

function Center({
  href, label, icon: Icon, active, badge = 0,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex min-h-[50px] flex-1 flex-col items-center justify-end transition-transform duration-100 active:scale-95"
    >
      <span
        className={cn(
          "relative -mt-6 flex h-[52px] w-[52px] items-center justify-center rounded-full text-white shadow-brand transition-transform",
          active ? "bg-brand-600" : "bg-linear-to-br from-brand-500 to-brand-600",
        )}
      >
        <Icon className="h-6 w-6" strokeWidth={2.2} />
        {badge > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-400 px-1 text-[10px] font-bold text-ink">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="mt-1 pb-1.5 text-[10px] font-medium leading-none text-brand-700">{label}</span>
    </Link>
  );
}
