"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Heart, LayoutGrid, ShoppingBag, User, Store, Package, Pill } from "lucide-react";
import { useAuthFlag } from "@/lib/use-auth-flag";
import { useFavorites } from "@/components/favorites/favorites-provider";
import { useCart } from "@/components/cart/cart-provider";
import { Bump } from "@/components/motion/bump";
import { cn } from "@/lib/utils";

/**
 * Нижнее меню-«островок»: полупрозрачная панель bg-surface/90 с blur,
 * активная вкладка подсвечена pill-заливкой brand-50, по центру — приподнятая
 * акцентная кнопка «Каталог» с фирменной тенью.
 * Порядок: Главная · Избранное · Каталог · Корзина · Профиль.
 *
 * Страницы рендерятся динамически, поэтому переход занимает время — чтобы
 * нажатие не казалось «мёртвым», вкладка подсвечивается оптимистично сразу
 * по тапу, а иконка пульсирует, пока навигация в работе (useLinkStatus).
 */
export function MobileNav() {
  const pathname = usePathname();
  const { count: favCount } = useFavorites();
  const { count: cartCount } = useCart();
  const loggedIn = useAuthFlag();
  // Залогиненный пользователь живёт в ОДНОМ постоянном баре везде —
  // без переключений между «магазинным» и «кабинетным» режимами.
  // «Магазин» открывает каталог (корзина — иконкой в шапке).
  const accountMode = loggedIn;

  // Оптимистичная подсветка нажатой вкладки до фактической смены маршрута
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    // Переход завершён — снимаем оптимистичное состояние
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    // Страховка: если переход прервался (свайп назад, ошибка сети) — сбросить
    if (!pendingHref) return;
    const t = setTimeout(() => setPendingHref(null), 8000);
    return () => clearTimeout(t);
  }, [pendingHref]);

  const current = pendingHref ?? pathname;
  const isActive = (href: string, exact?: boolean) =>
    exact ? current === href : current === href || current.startsWith(href + "/");

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto mx-auto flex w-full max-w-[460px] items-end justify-around glass rounded-[26px] px-1.5 py-1 shadow-[0_8px_28px_rgba(26,29,26,0.14)] ring-1 ring-black/[0.05]">
        {accountMode ? (
          <>
            {/* «Каталог» активен на любой витринной странице (вне ЛК и корзины) */}
            <Tab href="/catalog" label="Каталог" icon={LayoutGrid} active={!current.startsWith("/account") && !current.startsWith("/cart")} onPress={setPendingHref} />
            <Tab href="/account/favorites" label="Избранное" icon={Heart} active={isActive("/account/favorites")} badge={favCount} onPress={setPendingHref} />
            <CenterButton
              href="/account/intake"
              label="Приём"
              icon={Pill}
              active={isActive("/account/intake")}
              onPress={setPendingHref}
            />
            <Tab href="/cart" label="Корзина" icon={ShoppingBag} active={isActive("/cart")} badge={cartCount} badgeTone="accent" onPress={setPendingHref} />
            <Tab href="/account" label="Кабинет" icon={User} active={current.startsWith("/account") && !isActive("/account/favorites") && !isActive("/account/intake")} onPress={setPendingHref} />
          </>
        ) : (
          <>
            <Tab href="/" label="Главная" icon={Home} active={isActive("/", true)} onPress={setPendingHref} />
            <Tab href="/account/favorites" label="Избранное" icon={Heart} active={isActive("/account/favorites")} badge={favCount} onPress={setPendingHref} />
            <CenterButton
              href="/catalog"
              label="Каталог"
              icon={LayoutGrid}
              active={isActive("/catalog")}
              onPress={setPendingHref}
            />
            <Tab href="/cart" label="Корзина" icon={ShoppingBag} active={isActive("/cart")} badge={cartCount} badgeTone="accent" onPress={setPendingHref} />
            <Tab href="/account" label="Кабинет" icon={User} active={isActive("/account", true)} onPress={setPendingHref} />
          </>
        )}
      </div>
    </nav>
  );
}

/** Центральная приподнятая акцентная кнопка (Каталог в магазине, Приём в ЛК). */
function CenterButton({
  href, label, icon, active, onPress,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  onPress: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      onClick={() => onPress(href)}
      className="flex min-h-[50px] flex-1 flex-col items-center justify-end transition-transform duration-100 active:scale-95"
    >
      <CenterIcon icon={icon} active={active} />
      <span className="mt-1 pb-1.5 text-[11px] font-medium leading-none text-brand-700">{label}</span>
    </Link>
  );
}

function CenterIcon({
  icon: Icon, active,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(
        "-mt-6 flex h-[52px] w-[52px] items-center justify-center rounded-full text-white shadow-brand transition-transform",
        active ? "bg-brand-600" : "bg-linear-to-br from-brand-500 to-brand-600",
        pending && "animate-pulse",
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={2.2} />
    </span>
  );
}

function Tab({
  href, label, icon: Icon, active, badge = 0, badgeTone = "sale", onPress,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  badge?: number;
  badgeTone?: "sale" | "accent";
  onPress: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={() => onPress(href)}
      className={cn(
        // min-h 50px — комфортный тач-таргет; active:scale — мгновенный отклик на тап
        "flex min-h-[50px] flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-transform duration-100 active:scale-90",
        active ? "text-brand-700" : "text-ink-faint",
      )}
    >
      {/* pill-подсветка активной вкладки */}
      <span
        className={cn(
          "flex h-[26px] w-[46px] items-center justify-center rounded-full transition-colors duration-150",
          active && "bg-brand-50",
        )}
      >
        <TabIcon icon={Icon} active={active} badge={badge} badgeTone={badgeTone} />
      </span>
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </Link>
  );
}

/** Иконка вкладки: бейдж количества + пульсация на время перехода. */
function TabIcon({
  icon: Icon, active, badge, badgeTone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  badge: number;
  badgeTone: "sale" | "accent";
}) {
  const { pending } = useLinkStatus();
  return (
    <span className={cn("relative", pending && "animate-pulse")}>
      <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 1.9} />
      {badge > 0 ? (
        <Bump
          value={badge}
          className={cn(
            "absolute -right-2 -top-1.5 h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white",
            badgeTone === "accent" ? "bg-accent-400" : "bg-sale",
          )}
        >
          {badge}
        </Bump>
      ) : null}
    </span>
  );
}
