"use client";

import Link from "next/link";
import { Phone, Search, ShoppingCart, User, Heart } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useCart } from "@/components/cart/cart-provider";
import { useFavorites } from "@/components/favorites/favorites-provider";
import { Logo } from "./logo";

export interface HeaderCategory {
  slug: string;
  name: string;
}

export function Header({
  categories,
  phone,
  loggedIn,
}: {
  categories: HeaderCategory[];
  phone: string;
  loggedIn: boolean;
}) {
  const { count } = useCart();
  const { count: favCount } = useFavorites();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="border-b border-line bg-surface-soft py-1.5 text-sm text-ink-muted">
        <Container className="flex items-center justify-between">
          <span>Натуральные витамины и БАД для всей семьи</span>
          <div className="flex items-center gap-5">
            <Link href="/delivery" className="hover:text-brand-700">Доставка и оплата</Link>
            <Link href="/about" className="hover:text-brand-700">О компании</Link>
            <Link href="/contacts" className="hover:text-brand-700">Контакты</Link>
          </div>
        </Container>
      </div>

      <Container className="flex h-[var(--spacing-header)] items-center gap-4">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <form action="/search" className="relative flex-1">
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

        <Link href="/account/favorites" className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-soft" aria-label="Избранное">
          <Heart className="h-5 w-5" />
          {favCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-sale px-1 text-xs font-bold text-white ring-2 ring-surface">{favCount}</span>
          ) : null}
        </Link>

        <Link href="/account" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-soft" aria-label={loggedIn ? "Личный кабинет" : "Войти"}>
          <User className="h-5 w-5" />
        </Link>

        <Link href="/cart" className="relative flex h-11 items-center gap-2 rounded-full bg-brand-500 px-4 font-semibold text-white transition hover:bg-brand-600">
          <ShoppingCart className="h-5 w-5" />
          <span>Корзина</span>
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-400 px-1 text-xs font-bold text-white ring-2 ring-surface">{count}</span>
          ) : null}
        </Link>
      </Container>

      <div className="border-t border-line">
        <Container>
          <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto py-2">
            <Link href="/catalog" className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold text-ink hover:bg-surface-soft">Все товары</Link>
            {categories.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`} className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface-soft hover:text-ink">{c.name}</Link>
            ))}
            <Link href="/sale" className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-bold text-sale hover:bg-surface-soft">Акции</Link>
          </nav>
        </Container>
      </div>
    </header>
  );
}
