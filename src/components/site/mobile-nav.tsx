"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { useFavorites } from "@/components/favorites/favorites-provider";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

/**
 * Нижнее меню-«островок» в стиле iOS: компактная плавающая капсула с явными
 * боковыми отступами, размытием и тенью. По центру — приподнятая выделенная
 * кнопка «Каталог». Порядок: Главная · Избранное · Каталог · Корзина · Профиль.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { count: favCount } = useFavorites();
  const { count: cartCount } = useCart();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-[max(14px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto flex items-end gap-1 rounded-[30px] border border-white/50 bg-surface/85 px-2.5 py-2 shadow-[0_10px_34px_rgba(26,29,26,0.20)] backdrop-blur-2xl">
        <Tab href="/" label="Главная" icon={Home} active={isActive("/", true)} />
        <Tab href="/account/favorites" label="Избранное" icon={Heart} active={isActive("/account/favorites")} badge={favCount} />

        {/* центральная выделенная кнопка */}
        <Link href="/catalog" aria-label="Каталог" className="flex flex-col items-center -mt-7 px-1">
          <span
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-brand ring-4 ring-surface transition-transform active:scale-95",
              isActive("/catalog") ? "bg-brand-600" : "bg-brand-500",
            )}
          >
            <LayoutGrid className="h-7 w-7" strokeWidth={2.3} />
          </span>
          <span className="mt-0.5 text-[10px] font-bold text-brand-700">Каталог</span>
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
        "flex w-[58px] flex-col items-center gap-0.5 rounded-2xl py-1.5 transition-colors",
        active ? "text-brand-700" : "text-ink-muted",
      )}
    >
      <span className="relative">
        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.6 : 2} />
        {badge > 0 ? (
          <span
            className={cn(
              "absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-surface",
              badgeTone === "accent" ? "bg-accent-400" : "bg-sale",
            )}
          >
            {badge}
          </span>
        ) : null}
      </span>
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </Link>
  );
}
