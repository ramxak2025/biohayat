"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { useFavorites } from "@/components/favorites/favorites-provider";
import { useCart } from "@/components/cart/cart-provider";
import { Bump } from "@/components/motion/bump";
import { cn } from "@/lib/utils";

/**
 * Нижнее меню-«островок» в стиле iOS: широкая, но тонкая полупрозрачная панель
 * с тонкой обводкой, мягким размытием и приподнятой акцентной кнопкой «Каталог»
 * по центру. Порядок: Главная · Избранное · Каталог · Корзина · Профиль.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { count: favCount } = useFavorites();
  const { count: cartCount } = useCart();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto mx-auto flex w-full max-w-[460px] items-end justify-around rounded-[24px] border border-black/[0.04] bg-surface/80 px-1.5 py-1.5 shadow-[0_6px_22px_rgba(26,29,26,0.13)] backdrop-blur-2xl">
        <Tab href="/" label="Главная" icon={Home} active={isActive("/", true)} />
        <Tab href="/account/favorites" label="Избранное" icon={Heart} active={isActive("/account/favorites")} badge={favCount} />

        {/* центральная приподнятая кнопка */}
        <Link href="/catalog" aria-label="Каталог" className="flex flex-1 flex-col items-center">
          <span
            className={cn(
              "-mt-6 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-brand ring-[3px] ring-surface transition-transform active:scale-95",
              isActive("/catalog") ? "bg-brand-600" : "bg-brand-500",
            )}
          >
            <LayoutGrid className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <span className="mt-1 text-[10px] font-semibold leading-none text-brand-700">Каталог</span>
        </Link>

        <Tab href="/cart" label="Корзина" icon={ShoppingBag} active={isActive("/cart")} badge={cartCount} badgeTone="accent" />
        <Tab href="/account" label="Кабинет" icon={User} active={isActive("/account", true)} />
      </div>
    </nav>
  );
}

function Tab({
  href, label, icon: Icon, active, badge = 0, badgeTone = "sale",
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  badge?: number;
  badgeTone?: "sale" | "accent";
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-1 transition-colors",
        active ? "text-brand-600" : "text-ink-faint",
      )}
    >
      <span className="relative">
        <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 1.9} />
        {badge > 0 ? (
          <Bump
            value={badge}
            className={cn(
              "absolute -right-2 -top-1.5 h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ring-2 ring-surface",
              badgeTone === "accent" ? "bg-accent-500" : "bg-sale",
            )}
          >
            {badge}
          </Bump>
        ) : null}
      </span>
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </Link>
  );
}
