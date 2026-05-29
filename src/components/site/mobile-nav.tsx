"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Search, Heart, User } from "lucide-react";
import { useFavorites } from "@/components/favorites/favorites-provider";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Главная", icon: Home, exact: true },
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/search", label: "Поиск", icon: Search },
  { href: "/account/favorites", label: "Избранное", icon: Heart, fav: true },
  { href: "/account", label: "Профиль", icon: User },
];

/**
 * Нижнее меню-«островок» в стиле iOS: компактная плавающая капсула,
 * приподнятая над краем экрана, с размытием, тенью и анимированным
 * индикатором активного раздела. Только на мобильных.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { count } = useFavorites();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-white/50 bg-surface/80 p-1.5 shadow-[0_8px_30px_rgba(26,29,26,0.18)] backdrop-blur-2xl">
        {items.map((it) => {
          const active = it.exact
            ? pathname === it.href
            : it.href === "/account"
              ? pathname === "/account"
              : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              className={cn(
                "relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-full px-3.5 transition-all duration-300",
                active ? "text-white" : "text-ink-muted",
              )}
            >
              {active && (
                <span className="absolute inset-0 rounded-full bg-brand-500 shadow-brand transition-all" />
              )}
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} />
                {it.fav && count > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sale px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                    {count}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "relative text-[10px] font-semibold leading-none transition-all",
                  active ? "max-h-3 opacity-100" : "max-h-0 overflow-hidden opacity-0",
                )}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
