"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Coins, Heart, PillBottle, FlaskConical, MessageCircleHeart, UserCog, LogOut, MapPin, ChevronLeft,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/account", label: "Обзор", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "Мои заказы", icon: Package },
  { href: "/account/bonuses", label: "Бонусы", icon: Coins },
  { href: "/account/addresses", label: "Мои адреса", icon: MapPin },
  { href: "/account/favorites", label: "Избранное", icon: Heart },
  { href: "/account/intake", label: "Приём БАД", icon: PillBottle },
  { href: "/account/compatibility", label: "Совместимость", icon: FlaskConical },
  { href: "/account/consultation", label: "Консультация", icon: MessageCircleHeart },
  { href: "/account/profile", label: "Профиль", icon: UserCog },
];

export function AccountShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // На корне кабинета мобильной навигации сверху нет — там сам дашборд.
  const isRoot = pathname === "/account";
  return (
    // Нижний отступ на мобильных — под фиксированное мобильное меню
    <Container className="py-6 pb-[calc(var(--spacing-mobnav)+2.5rem)] sm:py-8 lg:pb-12">
      <div className="grid gap-5 lg:grid-cols-[272px_1fr] lg:gap-8">
        {/* На корне кабинета колонка на мобильном пуста — прячем, чтобы не было лишнего gap */}
        <aside className={cn("h-fit min-w-0 lg:sticky lg:top-24", isRoot && "hidden lg:block")}>
          {/* Шапка пользователя — только на десктопе (на мобильном экономим высоту) */}
          <div className="mb-3 hidden items-center gap-3 rounded-2xl bg-surface p-4 shadow-xs ring-1 ring-line lg:flex">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-extrabold text-white">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="truncate font-bold">{name}</div>
              <div className="text-xs text-ink-faint">Личный кабинет</div>
            </div>
          </div>

          {/* Мобайл: компактный возврат к дашборду кабинета (вместо ленты чипсов) */}
          {!isRoot && (
            <nav aria-label="Навигация по кабинету" className="lg:hidden">
              <Link
                href="/account"
                className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold text-ink-muted transition active:bg-surface-soft"
              >
                <ChevronLeft className="h-5 w-5" />
                Кабинет
              </Link>
            </nav>
          )}

          {/* Десктоп: вертикальное меню карточкой */}
          <nav
            aria-label="Разделы личного кабинета"
            className="hidden rounded-2xl bg-surface p-2 shadow-xs ring-1 ring-line lg:block"
          >
            {tabs.map((t) => {
              const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                    active ? "bg-brand-500 text-white shadow-sm" : "text-ink-muted hover:bg-surface-soft hover:text-ink",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {t.label}
                </Link>
              );
            })}
            <div className="mx-3 my-1.5 border-t border-line" />
            <form action="/account/logout" method="post">
              <button className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-sale transition hover:bg-sale-soft">
                <LogOut className="h-[18px] w-[18px]" /> Выйти
              </button>
            </form>
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
