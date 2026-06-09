"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Search, ShoppingCart, User, Heart, LayoutGrid, Flame } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useCart } from "@/components/cart/cart-provider";
import { useFavorites } from "@/components/favorites/favorites-provider";
import { Logo } from "./logo";

export function Header({ phone, loggedIn }: { phone: string; loggedIn: boolean }) {
  const { count } = useCart();
  const { count: favCount } = useFavorites();
  const pathname = usePathname();
  const current = (href: string) => (pathname === href ? ("page" as const) : undefined);

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

        <form action="/search" role="search" aria-label="Поиск по каталогу" className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
          <input
            name="q"
            type="search"
            aria-label="Поиск товаров"
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

      {/* Навигация по логике покупателя (категории — в боковом меню каталога) */}
      <div className="border-t border-line">
        <Container>
          <nav className="flex items-center gap-1 py-2 text-sm" aria-label="Основная навигация">
            <Link href="/catalog" aria-current={current("/catalog")} className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-bold text-ink hover:bg-surface-soft aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-700">
              <LayoutGrid className="h-4 w-4 text-brand-600" /> Каталог
            </Link>
            <span className="mx-1.5 h-4 w-px bg-line" />
            <span className="px-1.5 text-xs font-bold uppercase tracking-wide text-ink-faint">Для кого</span>
            <Link href="/for/men" aria-current={current("/for/men")} className="rounded-full px-3 py-1.5 font-medium text-ink-muted hover:bg-surface-soft hover:text-ink aria-[current=page]:bg-brand-50 aria-[current=page]:font-bold aria-[current=page]:text-brand-700">Мужчинам</Link>
            <Link href="/for/women" aria-current={current("/for/women")} className="rounded-full px-3 py-1.5 font-medium text-ink-muted hover:bg-surface-soft hover:text-ink aria-[current=page]:bg-brand-50 aria-[current=page]:font-bold aria-[current=page]:text-brand-700">Женщинам</Link>
            <Link href="/for/kids" aria-current={current("/for/kids")} className="rounded-full px-3 py-1.5 font-medium text-ink-muted hover:bg-surface-soft hover:text-ink aria-[current=page]:bg-brand-50 aria-[current=page]:font-bold aria-[current=page]:text-brand-700">Детям</Link>
            <Link href="/account/consultation" aria-current={current("/account/consultation")} className="rounded-full px-3 py-1.5 font-medium text-ink-muted hover:bg-surface-soft hover:text-ink aria-[current=page]:bg-brand-50 aria-[current=page]:font-bold aria-[current=page]:text-brand-700">Консультация</Link>

            <span className="flex-1" />

            <Link
              href="/sale"
              aria-current={current("/sale")}
              className="sale-pulse flex items-center gap-1.5 rounded-full bg-sale/10 px-4 py-1.5 font-bold text-sale transition hover:bg-sale/15"
            >
              <Flame className="h-4 w-4" /> Распродажа
            </Link>
          </nav>
        </Container>
      </div>
    </header>
  );
}
