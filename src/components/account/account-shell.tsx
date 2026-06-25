"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Heart, PillBottle, FlaskConical, MessageCircleHeart, UserCog, MapPin, LogOut,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/account", label: "Обзор", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "Мои заказы", icon: Package },
  { href: "/account/addresses", label: "Адреса", icon: MapPin },
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
  return (
    <Container className="py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-lg font-extrabold text-white">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="truncate font-bold">{name}</div>
              <div className="text-xs text-ink-faint">Личный кабинет</div>
            </div>
          </div>
          {/* горизонтальные вкладки на мобильном, вертикальные на десктопе */}
          <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
            {tabs.map((t) => {
              const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition lg:shrink",
                    active ? "bg-brand-500 text-white shadow-sm" : "text-ink-muted hover:bg-surface-soft hover:text-ink",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {t.label}
                </Link>
              );
            })}
            <form action="/account/logout" method="post" className="lg:mt-2">
              <button className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10">
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
