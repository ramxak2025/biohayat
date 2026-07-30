"use client";

import { ListLink as Link } from "@/components/ui/list-link";
import { usePathname } from "next/navigation";
import { Phone, Search, ShoppingCart, User, Heart, ListChecks } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useCart } from "@/components/cart/cart-provider";
import { useFavorites } from "@/components/favorites/favorites-provider";
import { Bump } from "@/components/motion/bump";
import { CatalogMenu } from "./catalog-menu";
import { useAuthFlag, useAuthName } from "@/lib/use-auth-flag";
import { formatMoney } from "@/lib/utils";
import { Logo } from "./logo";
import { SectionSwitch } from "@/components/ui/section-switch";

/**
 * Десктопная шапка. Две строки, 109px:
 *   1) полоса доверия на brand-900 (36px): телефон · часы · производство и
 *      сертификаты · сервисные ссылки;
 *   2) основная (72px): лого · «Каталог» с панелью · поиск · действия.
 *
 * Третьей строки навигации больше нет: 17 категорий в неё не помещались, их
 * приходилось резать произвольным числом или прокручивать с обрывами названий.
 * Теперь весь каталог раскрывается панелью из кнопки «Каталог».
 *
 * Порядок элементов выстроен по тому, как принимается решение о покупке БАД:
 * сначала кто продаёт (производство, сертификаты, телефон), потом что подойдёт
 * (каталог, подбор, поиск) и только затем действие (корзина).
 *
 * Суммарная высота с границей: 36 + 72 + 1 = 109px. Это же значение отдаётся
 * в --header-h для панели каталога и sticky-офсетов.
 */
export function Header({
  phone,
  workingHours = "Пн–Вс, 9:00–18:00",
  categories = [],
}: {
  phone: string;
  /** Режим работы для полосы доверия (из настроек магазина). */
  workingHours?: string;
  /** Категории каталога для панели «Каталог». */
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
    <header
      className="sticky top-0 z-40 hidden border-b border-line bg-surface lg:block"
      style={{ ["--header-h" as string]: "109px" }}
    >
      {/* 1. Полоса доверия: кто продаёт. Первое, что должен увидеть покупатель БАД. */}
      <div className="bg-brand-900 text-[13px] text-brand-100/85">
        <Container className="flex h-9 items-center justify-between gap-8">
          <div className="flex min-w-0 items-center gap-6">
            {/* Переключатель раздела — первым в строке. Ссылка «Опт» раньше
                стояла последней среди служебных, набранная тем же 13px: её
                искали и не находили. */}
            <SectionSwitch active="retail" retailUrl="/" />
            <a
              href={`tel:${phone.replace(/[^\d+]/g, "")}`}
              className="flex shrink-0 items-center gap-1.5 font-semibold text-white transition hover:text-accent-200"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {phone}
            </a>
            <span className="hidden shrink-0 xl:inline">{workingHours}</span>
            {/* Проверяемые факты вместо слогана: слоган занимал лучшее место и
                ничего не доказывал. */}
            <Link
              href="/about"
              className="hidden min-w-0 truncate transition hover:text-white lg:inline"
            >
              Собственное производство в России · сертификаты ЕАЭС
            </Link>
          </div>
          <nav className="flex shrink-0 items-center gap-6" aria-label="Информация для покупателей">
            <Link href="/delivery" className="transition hover:text-white">Доставка и оплата</Link>
            <Link href="/contacts" className="transition hover:text-white">Контакты</Link>
          </nav>
        </Container>
      </div>

      {/* 2. Основная строка: все элементы высотой 48px на одной базовой линии. */}
      <Container className="flex h-[var(--spacing-header)] items-center gap-6">
        <Link href="/" className="shrink-0" aria-label="ХАЯТ — на главную">
          <Logo />
        </Link>

        <CatalogMenu categories={categories} />

        <form
          action="/search"
          role="search"
          aria-label="Поиск по каталогу"
          className="relative w-full max-w-[720px] flex-1"
        >
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-600"
            aria-hidden="true"
          />
          <input
            name="q"
            type="search"
            aria-label="Поиск товаров"
            placeholder="Поиск: витамин D3, коллаген, мёд…"
            className="h-12 w-full rounded-full border border-line-strong bg-surface-soft/70 pl-11 pr-24 text-[15px] text-ink transition placeholder:text-ink-faint hover:border-brand-300 focus:border-brand-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-full px-4 text-[15px] font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Найти
          </button>
        </form>

        <div className="flex shrink-0 items-center gap-2">
          {/* Подбор — главный вход для тех, кто не знает, что ему нужно. */}
          <Link
            href="/quiz"
            aria-current={current("/quiz")}
            className="hidden h-12 items-center gap-2 rounded-full px-3.5 text-[15px] font-semibold text-ink-muted transition hover:bg-brand-50 hover:text-brand-700 xl:flex"
          >
            <ListChecks className="h-[18px] w-[18px] text-brand-600" aria-hidden="true" />
            Подобрать
          </Link>

          <Link
            href="/account/favorites"
            className="relative flex h-12 w-12 items-center justify-center rounded-full text-ink transition hover:bg-brand-50 hover:text-brand-700"
            aria-label="Избранное"
          >
            <Heart className="h-5 w-5" />
            {favCount > 0 ? (
              <Bump
                value={favCount}
                className="absolute right-1 top-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-sale px-1 text-xs font-bold text-white ring-2 ring-surface"
              >
                {favCount}
              </Bump>
            ) : null}
          </Link>

          <Link
            href="/account"
            className="flex h-12 items-center gap-2 rounded-full px-3 text-ink transition hover:bg-brand-50 hover:text-brand-700"
            aria-label={loggedIn ? "Личный кабинет" : "Войти"}
          >
            {loggedIn ? (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
                aria-hidden="true"
              >
                {initial}
              </span>
            ) : (
              <User className="h-5 w-5" aria-hidden="true" />
            )}
            <span className="hidden max-w-24 truncate text-[15px] font-semibold xl:inline">
              {loggedIn ? authName.split(" ")[0] || "Кабинет" : "Войти"}
            </span>
          </Link>

          <Link
            href="/cart"
            className="relative flex h-12 items-center gap-2 rounded-full bg-brand-500 px-5 text-[15px] font-bold text-white transition hover:bg-brand-600"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {count > 0 ? formatMoney(totalKopecks) : "Корзина"}
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
    </header>
  );
}
