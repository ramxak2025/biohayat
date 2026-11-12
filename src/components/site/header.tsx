"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { CATALOG_DIRECTIONS } from "../../../shared/catalog-directions";
import { ListLink as Link } from "@/components/ui/list-link";
import { useCart } from "@/components/cart/cart-provider";
import { useFavorites } from "@/components/favorites/favorites-provider";
import { Bump } from "@/components/motion/bump";
import { useAuthFlag } from "@/lib/use-auth-flag";
import { onAppScroll } from "@/lib/app-scroll";
import { DirectionMark } from "./direction-mark";
import { Logo } from "./logo";
import { SearchOverlay } from "./mobile-search";

export function Header({ phone, wildberries }: { phone: string; wildberries: string | null }) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loggedIn = useAuthFlag();
  const { count } = useCart();
  const { count: favoriteCount } = useFavorites();
  const productPage = pathname.startsWith("/product/");
  const immersive = pathname === "/" || productPage || CATALOG_DIRECTIONS.some(({ path }) => path === pathname);
  const fullMobileSearch = immersive && !productPage;
  const photoBacked = immersive && !scrolled;

  useEffect(() => {
    if (!immersive) return;
    const update = () => {
      const hero = document.querySelector("main .vysota-hero");
      if (!hero || !headerRef.current) return;
      setScrolled(hero.getBoundingClientRect().bottom < headerRef.current.getBoundingClientRect().bottom);
    };
    update();
    window.addEventListener("resize", update);
    const detachScroll = onAppScroll(update);
    return () => {
      window.removeEventListener("resize", update);
      detachScroll();
    };
  }, [immersive, pathname]);

  const cart = (
    <Link
      href="/cart"
      aria-label={count ? `Корзина, товаров: ${count}` : "Корзина"}
      className="site-header-action site-header-cart"
    >
      <ShoppingBag size={21} strokeWidth={1.6} aria-hidden="true" />
      {count > 0 ? <Bump value={count} className="site-header-count">{count}</Bump> : null}
    </Link>
  );

  return (
    <>
      <header ref={headerRef} className="site-header" data-immersive={immersive} data-compact={productPage} data-scrolled={scrolled}>
        <nav className="site-service" aria-label="Служебное">
          {phone ? <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a> : null}
          <div>
            <Link href="/quiz">Подобрать</Link>
            <Link href="/delivery">Доставка и оплата</Link>
            {wildberries ? <a href={wildberries} target="_blank" rel="noreferrer">Wildberries</a> : null}
            <Link href="/opt" data-to-opt>Оптовым покупателям <ArrowUpRight size={14} aria-hidden="true" /></Link>
          </div>
        </nav>

        <div className={photoBacked ? "site-header-row glass" : "site-header-row"}>
          <details className="site-mobile-menu lg:hidden" key={pathname}>
            <summary className="site-header-action" aria-label="Меню">
              <Menu size={22} strokeWidth={1.6} aria-hidden="true" />
            </summary>
            <nav
              aria-label="Меню"
              className="site-mobile-menu-links"
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest("a")) {
                  event.currentTarget.parentElement?.removeAttribute("open");
                }
              }}
            >
              <Link href="/catalog">Весь каталог</Link>
              {CATALOG_DIRECTIONS.map((direction) => (
                <Link key={direction.id} href={direction.path} aria-current={pathname === direction.path ? "page" : undefined}>
                  <DirectionMark direction={direction} />
                </Link>
              ))}
              <Link href="/articles">Статьи</Link>
              <Link href="/quiz">Подобрать</Link>
              <Link href="/delivery">Доставка и оплата</Link>
              <Link href="/contacts">Контакты</Link>
              <Link href="/opt" data-to-opt>Оптовым покупателям</Link>
            </nav>
          </details>

          <Link href="/" aria-label="ХАЯТ — на главную" className="flex min-h-11 shrink-0 items-center">
            <Logo tone="inverted" />
          </Link>

          <nav aria-label="Направления" className="site-direction-nav">
            {CATALOG_DIRECTIONS.map((direction) => (
              <Link key={direction.id} href={direction.path} aria-current={pathname === direction.path ? "page" : undefined}>
                <DirectionMark direction={direction} dark />
              </Link>
            ))}
            <Link href="/catalog" aria-current={pathname === "/catalog" ? "page" : undefined}>Каталог</Link>
            <Link href="/articles" className="max-xl:hidden">Статьи</Link>
          </nav>

          <div className="hidden shrink-0 items-center gap-1 lg:flex">
            <Link href="/search" className="site-header-action" aria-label="Поиск по каталогу">
              <Search size={21} strokeWidth={1.6} aria-hidden="true" />
            </Link>
            <Link href="/account/favorites" className="site-header-action" aria-label="Избранное">
              <Heart size={21} strokeWidth={1.6} aria-hidden="true" />
              {favoriteCount > 0 ? <Bump value={favoriteCount} className="site-header-count">{favoriteCount}</Bump> : null}
            </Link>
            <Link href="/account" className="site-header-action" aria-label={loggedIn ? "Личный кабинет" : "Войти"}>
              <User size={21} strokeWidth={1.6} aria-hidden="true" />
            </Link>
            {cart}
          </div>
          <div className="flex items-center lg:hidden">
            {fullMobileSearch ? null : (
              <button type="button" className="site-header-action" aria-label="Поиск по каталогу" onClick={() => setSearchOpen(true)}>
                <Search size={21} strokeWidth={1.6} aria-hidden="true" />
              </button>
            )}
            {cart}
          </div>
        </div>

        {fullMobileSearch ? (
          <button
            type="button"
            className={photoBacked ? "site-mobile-search glass" : "site-mobile-search"}
            onClick={() => setSearchOpen(true)}
          >
            <Search size={20} strokeWidth={1.6} aria-hidden="true" />
            <span>Поиск по каталогу</span>
          </button>
        ) : null}
      </header>
      {searchOpen ? <SearchOverlay onClose={() => setSearchOpen(false)} /> : null}
    </>
  );
}
