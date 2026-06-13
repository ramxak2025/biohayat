"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Package, FolderTree, Image as ImageIcon, CirclePlay,
  FileText, ClipboardList, Settings, LogOut, Menu, X, ExternalLink,
  Users, FlaskConical, TicketPercent, Star, Building2, Award,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

// adminOnly: пункты, скрытые от роли EDITOR (доступ дополнительно проверяется на сервере)
const nav = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Товары", icon: Package },
  { href: "/admin/categories", label: "Категории", icon: FolderTree },
  { href: "/admin/brands", label: "Бренды", icon: Award },
  { href: "/admin/banners", label: "Баннеры", icon: ImageIcon },
  { href: "/admin/stories", label: "Сторис", icon: CirclePlay },
  { href: "/admin/materials", label: "Материалы", icon: FileText },
  { href: "/admin/reviews", label: "Отзывы", icon: Star },
  { href: "/admin/promocodes", label: "Промокоды", icon: TicketPercent },
  { href: "/admin/orders", label: "Заявки", icon: ClipboardList },
  { href: "/admin/wholesale", label: "Опт", icon: Building2 },
  { href: "/admin/customers", label: "Клиенты", icon: Users },
  { href: "/admin/compatibility", label: "Совместимость", icon: FlaskConical, adminOnly: true },
  { href: "/admin/settings", label: "Настройки", icon: Settings, adminOnly: true },
];

export function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role?: "ADMIN" | "EDITOR" };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visibleNav = nav.filter((item) => !item.adminOnly || user.role !== "EDITOR");

  const SidebarContent = (
    <>
      <div className="flex items-center justify-between p-5">
        <Logo />
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Закрыть">
          <X className="h-6 w-6" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visibleNav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                active ? "bg-brand-500 text-white shadow-sm" : "text-ink-muted hover:bg-surface-soft hover:text-ink",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <Link
          href="/"
          target="_blank"
          className="mb-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-soft"
        >
          <ExternalLink className="h-5 w-5" /> Открыть сайт
        </Link>
        <div className="rounded-xl bg-surface-soft px-3.5 py-2.5">
          <div className="truncate text-sm font-bold">{user.name}</div>
          <div className="truncate text-xs text-ink-faint">{user.email}</div>
          <form action="/admin/logout" method="post">
            <button className="mt-2 flex items-center gap-2 text-sm font-semibold text-danger hover:underline">
              <LogOut className="h-4 w-4" /> Выйти
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-surface-soft">
      {/* desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        {SidebarContent}
      </aside>

      {/* mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-surface">{SidebarContent}</aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Меню">
            <Menu className="h-6 w-6" />
          </button>
          <Logo />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
