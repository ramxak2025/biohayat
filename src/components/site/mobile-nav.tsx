"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, Tag, Phone } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Главная", icon: Home, exact: true },
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/cart", label: "Корзина", icon: ShoppingBag, cart: true },
  { href: "/sale", label: "Акции", icon: Tag },
  { href: "/contacts", label: "Контакты", icon: Phone },
];

/**
 * Нижнее мобильное меню в стиле iOS 26 («liquid glass»):
 * плавающая полупрозрачная панель с размытием, скруглениями и safe-area.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 pb-2 lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around rounded-[28px] border border-white/40 bg-surface/70 px-1.5 py-1.5 shadow-lg backdrop-blur-xl">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] py-1.5 transition-colors",
                active ? "text-white" : "text-ink-muted",
              )}
            >
              {active ? (
                <span className="absolute inset-0 rounded-[22px] bg-brand-500 shadow-brand" />
              ) : null}
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                {it.cart && count > 0 ? (
                  <span
                    className={cn(
                      "absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ring-2 ring-surface",
                      active ? "bg-accent-400 text-white" : "bg-brand-500 text-white",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </span>
              <span className="relative text-[10px] font-semibold leading-none">
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
