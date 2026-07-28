"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Phone,
  Clock,
  Search,
  ShoppingCart,
  User,
  Heart,
  LayoutGrid,
  Flame,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { useCart } from "@/components/cart/cart-provider";
import { useFavorites } from "@/components/favorites/favorites-provider";
import { Bump } from "@/components/motion/bump";
import { useAuthFlag, useAuthName } from "@/lib/use-auth-flag";
import { formatMoney } from "@/lib/utils";
import { Logo } from "./logo";

/**
 * Десктопная шапка (мобильная — отдельный компонент). Три строки:
 *   1) utility-полоса на brand-900 (28px): телефон, часы работы, сервисные ссылки;
 *   2) основная строка (var(--spacing-header) = 80px): лого · поисковая капсула · действия;
 *   3) навигация (48px): «Каталог» · категории · аудитории · «Распродажа».
 * Суммарная высота с нижней границей: 28 + 80 + 48 + 1 = 157px — sticky-офсеты
 * (например, сайдбар каталога) должны отсчитываться от этой величины.
 *
 * Категорий в каталоге больше, чем влезает в строку: показываем те, что
 * помещаются без переноса, остальные доступны из «Каталога». Горизонтальный
 * скролл в шапке рвал названия посреди слова и читался как шаблон.
 */
export function Header({
  phone,
  workingHours = "Пн–Вс, 9:00–18:00",
  categories = [],
}: {
  phone: string;
  /** Режим работы для utility-полосы (из настроек магазина). */
  workingHours?: string;
  /** Категории каталога для нижней строки навигации (опционально). */
  categories?: { slug: string; name: string }[];
}) {
  // Признак входа читаем на клиенте из cookie-флага hayat_auth: серверный HTML
  // одинаков для всех (нейтральное «Войти»), меняется только подпись —
  // иконка та же, мигания нет. Это позволяет отдавать страницы статически.
  const loggedIn = useAuthFlag();
  const authName = useAuthName();
  const { count, totalKopecks } = useCart();
  const { count: favCount } = useFavorites();
  const pathname = usePathname();
  const current = (href: string) => (pathname === href ? ("page" as const) : undefined);
  const initial = (authName.trim().charAt(0) || "Я").toUpperCase();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-line shadow-sm lg:block">
      {/* 1. Тонкая utility-полоса: телефон · часы работы · сервисные ссылки */}
      <div className="bg-brand-900 text-xs text-brand-100/80">
        <Container className="flex h-7 items-center justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <a
              href={`tel:${phone.replace(/[^\d+]/g, "")}`}
              className="flex shrink-0 items-center gap-1.5 font-semibold text-white transition hover:text-accent-200"
            >
              <Phone className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
              {phone}
            </a>
            <span className="flex shrink-0 items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
              {workingHours}
            </span>
            <span className="hidden truncate text-brand-100/60 xl:inline">
              Натуральные витамины и БАД для всей семьи
            </span>
          </div>
          <nav className="flex shrink-0 items-center gap-4" aria-label="Информация для покупателей">
            <Link href="/about" className="transition hover:text-white">О компании</Link>
            <Link href="/delivery" className="transition hover:text-white">Доставка и оплата</Link>
            <Link href="/contacts" className="transition hover:text-white">Контакты</Link>
          </nav>
        </Container>
      </div>

      {/* 2. Основная строка на «стекле»: лого · большая поисковая капсула · действия */}
      <div className="glass">
        <Container className="flex h-[var(--spacing-header)] items-center gap-6">
          <Link href="/" className="shrink-0" aria-label="ХАЯТ — на главную">
            <Logo />
          </Link>

          <form
            action="/search"
            role="search"
            aria-label="Поиск по каталогу"
            className="relative mx-auto w-full max-w-[640px] flex-1"
          >
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-[22px] w-[22px] -translate-y-1/2 text-brand-600"
              aria-hidden="true"
            />
            <input
              name="q"
              type="search"
              aria-label="Поиск товаров"
              placeholder="Поиск: витамин D3, коллаген, мёд…"
              className="h-[52px] w-full rounded-full border border-line-strong bg-surface pl-12 pr-28 text-base text-ink shadow-xs transition placeholder:text-ink-faint hover:border-brand-300 hover:shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-full bg-brand-500 px-5 text-[15px] font-bold text-white transition hover:bg-brand-600 active:scale-[0.98]"
            >
              Найти
            </button>
          </form>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/account/favorites"
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-brand-50 hover:text-brand-700"
              aria-label="Избранное"
            >
              <Heart className="h-5 w-5" />
              {favCount > 0 ? (
                <Bump
                  value={favCount}
                  className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full bg-sale px-1 text-xs font-bold text-white ring-2 ring-surface"
                >
                  {favCount}
                </Bump>
              ) : null}
            </Link>

            <Link
              href="/account"
              className="flex h-11 items-center gap-2 rounded-full px-2.5 text-ink transition hover:bg-brand-50 hover:text-brand-700"
              aria-label={loggedIn ? "Личный кабинет" : "Войти"}
            >
              {loggedIn ? (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-sm font-bold text-white shadow-sm"
                  aria-hidden="true"
                >
                  {initial}
                </span>
              ) : (
                <User className="h-5 w-5" aria-hidden="true" />
              )}
              <span className="hidden max-w-24 truncate text-sm font-medium xl:inline">
                {loggedIn ? authName.split(" ")[0] || "Кабинет" : "Войти"}
              </span>
            </Link>

            <Link
              href="/cart"
              className="relative ml-1 flex h-11 items-center gap-2 rounded-full bg-brand-500 px-4 font-semibold text-white shadow-brand transition hover:bg-brand-600"
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm">{count > 0 ? formatMoney(totalKopecks) : "Корзина"}</span>
              {count > 0 ? (
                <Bump
                  value={count}
                  className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full bg-accent-400 px-1 text-xs font-bold text-ink ring-2 ring-surface"
                >
                  {count}
                </Bump>
              ) : null}
            </Link>
          </div>
        </Container>
      </div>

      {/* 3. Навигация: «Каталог» · категории · аудитории · «Распродажа» */}
      <div className="glass border-t border-line/70">
        <Container>
          <nav className="flex h-12 items-center gap-2" aria-label="Основная навигация">
            <Link
              href="/catalog"
              aria-current={current("/catalog")}
              className="group flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-4 py-1.5 font-bold text-brand-800 transition hover:bg-brand-100 aria-[current=page]:bg-brand-600 aria-[current=page]:text-white"
            >
              <LayoutGrid className="h-4 w-4 text-brand-600 group-aria-[current=page]:text-white" aria-hidden="true" />
              Каталог
            </Link>

            {categories.length > 0 ? (
              <div className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-hidden px-1">
                {categories.slice(0, 3).map((c) => {
                  const href = `/category/${c.slug}`;
                  return (
                    <Link
                      key={c.slug}
                      href={href}
                      aria-current={current(href)}
                      className="flex h-full shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3 text-[15px] font-semibold text-ink-muted transition hover:border-brand-400 hover:text-brand-700 aria-[current=page]:border-brand-500 aria-[current=page]:text-brand-700"
                    >
                      {c.name}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <span className="flex-1" />
            )}

            {/* Навигация по аудиториям — компактно */}
            <span className="mx-1 h-4 w-px shrink-0 bg-line" aria-hidden="true" />
            <div className="flex shrink-0 items-center gap-0.5 text-[13px]">
              <Link href="/for/men" aria-current={current("/for/men")} className="rounded-full px-2.5 py-1 font-medium text-ink-muted transition hover:bg-brand-50 hover:text-brand-700 aria-[current=page]:bg-brand-50 aria-[current=page]:font-bold aria-[current=page]:text-brand-700">Мужчинам</Link>
              <Link href="/for/women" aria-current={current("/for/women")} className="rounded-full px-2.5 py-1 font-medium text-ink-muted transition hover:bg-brand-50 hover:text-brand-700 aria-[current=page]:bg-brand-50 aria-[current=page]:font-bold aria-[current=page]:text-brand-700">Женщинам</Link>
              <Link href="/for/kids" aria-current={current("/for/kids")} className="rounded-full px-2.5 py-1 font-medium text-ink-muted transition hover:bg-brand-50 hover:text-brand-700 aria-[current=page]:bg-brand-50 aria-[current=page]:font-bold aria-[current=page]:text-brand-700">Детям</Link>
              <Link href="/account/consultation" aria-current={current("/account/consultation")} className="rounded-full px-2.5 py-1 font-medium text-ink-muted transition hover:bg-brand-50 hover:text-brand-700 aria-[current=page]:bg-brand-50 aria-[current=page]:font-bold aria-[current=page]:text-brand-700">Консультация</Link>
            </div>

            <Link
              href="/sale"
              aria-current={current("/sale")}
              className="ml-1 flex shrink-0 items-center gap-2 rounded-full bg-sale-soft px-4 py-1.5 font-bold text-sale transition hover:bg-sale/15"
            >
              <span className="sale-pulse h-1.5 w-1.5 rounded-full bg-sale" aria-hidden="true" />
              <Flame className="h-4 w-4" aria-hidden="true" />
              Распродажа
            </Link>
          </nav>
        </Container>
      </div>
    </header>
  );
}
