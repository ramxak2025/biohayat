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
  { href: "/admin/crm-deliveries", label: "Доставка в CRM", icon: ClipboardList },
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
        <Logo tone="inverted" />
        <button className="grid size-11 place-items-center rounded-full lg:hidden" onClick={() => setOpen(false)} aria-label="Закрыть">
          <X className="h-6 w-6" />
        </button>
      </div>
      <nav aria-label="Панель управления" className="flex-1 space-y-1 px-3">
        {visibleNav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition",
                active ? "bg-mist text-ink" : "text-mist/85 hover:bg-slope hover:text-mist",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-mist/15 p-3">
        <Link
          href="/"
          target="_blank"
          className="mb-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-mist/85 hover:bg-slope"
        >
          <ExternalLink className="h-5 w-5" /> Открыть сайт
        </Link>
        <div className="rounded-xl bg-slope px-3.5 py-2.5">
          <div className="truncate text-sm font-bold">{user.name}</div>
          <div className="truncate text-xs text-mist/80">{user.email}</div>
          <form action="/admin/logout" method="post">
            <button className="mt-2 flex items-center gap-2 text-sm font-semibold text-mist hover:underline">
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
      <aside className="vysota-dark hidden w-64 shrink-0 flex-col bg-night text-mist lg:flex">
        {SidebarContent}
      </aside>

      {/* mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="vysota-dark absolute left-0 top-0 flex h-full w-72 max-w-[90vw] flex-col overflow-y-auto bg-night text-mist">{SidebarContent}</aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="vysota-dark flex h-16 items-center gap-3 bg-night px-4 text-mist lg:hidden">
          <button className="grid size-11 place-items-center rounded-full" onClick={() => setOpen(true)} aria-label="Меню">
            <Menu className="h-6 w-6" />
          </button>
          <Logo tone="inverted" />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
