"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Phone, Search, ShoppingCart, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export interface HeaderCategory {
  slug: string;
  name: string;
}

export function Header({
  categories,
  phone,
}: {
  categories: HeaderCategory[];
  phone: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      {/* верхняя полоса */}
      <div className="hidden border-b border-line bg-surface-soft py-1.5 text-sm text-ink-muted lg:block">
        <Container className="flex items-center justify-between">
          <span>Натуральные витамины и БАД для всей семьи</span>
          <div className="flex items-center gap-5">
            <Link href="/delivery" className="hover:text-brand-700">
              Доставка и оплата
            </Link>
            <Link href="/about" className="hover:text-brand-700">
              О компании
            </Link>
            <Link href="/contacts" className="hover:text-brand-700">
              Контакты
            </Link>
          </div>
        </Container>
      </div>

      <Container className="flex h-[var(--spacing-header)] items-center gap-4">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-soft lg:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Меню"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        {/* поиск */}
        <form action="/catalog" className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
          <input
            name="q"
            placeholder="Поиск товаров: витамин D3, коллаген, мёд…"
            className="h-11 w-full rounded-full border border-line bg-surface-soft pl-11 pr-4 text-[15px] placeholder:text-ink-faint focus:border-brand-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </form>

        <a
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
          className="hidden items-center gap-2 font-semibold text-ink hover:text-brand-700 xl:flex"
        >
          <Phone className="h-4 w-4 text-brand-500" />
          {phone}
        </a>

        <Link
          href="/cart"
          className="relative flex h-11 items-center gap-2 rounded-full bg-brand-500 px-4 font-semibold text-white transition hover:bg-brand-600"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="hidden sm:inline">Корзина</span>
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-400 px-1 text-xs font-bold text-white ring-2 ring-surface">
              {count}
            </span>
          ) : null}
        </Link>
      </Container>

      {/* нижняя строка категорий (desktop) */}
      <div className="hidden border-t border-line lg:block">
        <Container>
          <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto py-2">
            <Link
              href="/catalog"
              className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold text-ink hover:bg-surface-soft"
            >
              Все товары
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface-soft hover:text-ink"
              >
                {c.name}
              </Link>
            ))}
            <Link
              href="/sale"
              className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-bold text-sale hover:bg-surface-soft"
            >
              Акции
            </Link>
          </nav>
        </Container>
      </div>

      {/* мобильное меню (выезжающая панель) */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          menuOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-ink/40 transition-opacity",
            menuOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={cn(
            "absolute left-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-surface transition-transform duration-300",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-line p-4">
            <Logo />
            <button
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-soft"
              aria-label="Закрыть"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            <Link
              href="/catalog"
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl px-4 py-3 font-bold hover:bg-surface-soft"
            >
              Все товары
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 font-medium text-ink-muted hover:bg-surface-soft"
              >
                {c.name}
              </Link>
            ))}
            <Link
              href="/sale"
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl px-4 py-3 font-bold text-sale hover:bg-surface-soft"
            >
              Акции
            </Link>
            <div className="my-2 border-t border-line" />
            {[
              ["/about", "О компании"],
              ["/delivery", "Доставка и оплата"],
              ["/articles", "Статьи"],
              ["/contacts", "Контакты"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-ink-muted hover:bg-surface-soft"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
