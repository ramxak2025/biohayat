"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { SearchTrigger, SearchOverlay } from "@/components/site/mobile-search";
import { cn } from "@/lib/utils";

/**
 * Мобильная шапка в стиле приложения: логотип + капсула поиска.
 *
 * Поведение при скролле:
 *  - вниз — строка логотипа плавно прячется, остаётся только поиск;
 *  - слегка вверх — логотип возвращается (паттерн нативных приложений);
 *  - с прокруткой появляется тень/граница.
 *
 * Safe-area: отдельный спейсер высотой env(safe-area-inset-top) ВНУТРИ
 * закрашенного контейнера. В Safari высота инсета скачет при сворачивании
 * панели браузера — спейсер растягивается вместе с ней, и капсула поиска
 * никогда не ныряет под статус-бар (раньше при лёгком скролле вверх её
 * обрезало именно из-за этого).
 */
export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false); // логотип спрятан
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 4);
        const dy = y - lastY.current;
        // Вверху страницы логотип показан всегда; дальше — по направлению.
        if (y < 56) setCompact(false);
        else if (dy > 6) setCompact(true);
        else if (dy < -6) setCompact(false);
        lastY.current = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // блокируем прокрутку фона, когда оверлей открыт
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 bg-bg/95 backdrop-blur-xl transition-shadow duration-300 lg:hidden",
          scrolled && "shadow-[0_1px_0_var(--color-line),0_8px_24px_rgba(26,29,26,0.06)]",
        )}
      >
        {/* Спейсер safe-area: тянется/сжимается вместе с инсетом Safari */}
        <div style={{ height: "env(safe-area-inset-top, 0px)" }} />

        {/* Строка логотипа — прячется при скролле вниз */}
        <div
          className={cn(
            "grid overflow-hidden px-4 transition-all duration-300 ease-out",
            compact
              ? "pointer-events-none max-h-0 -translate-y-1 opacity-0"
              : "max-h-14 translate-y-0 pt-2 opacity-100",
          )}
        >
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="ХАЯТ — на главную" className="-ml-1 p-1">
              <Logo className="scale-[0.92] origin-left" />
            </Link>
            <Link
              href="/sale"
              className="flex items-center gap-1.5 rounded-full bg-sale-soft px-3 py-1.5 text-xs font-bold text-sale active:scale-95"
            >
              <span className="sale-pulse h-1.5 w-1.5 rounded-full bg-sale" />
              Распродажа
            </Link>
          </div>
        </div>

        {/* Поиск */}
        <div className="px-3 pb-2.5 pt-2">
          <SearchTrigger onOpen={() => setOpen(true)} />
        </div>
      </header>

      {open ? <SearchOverlay onClose={() => setOpen(false)} /> : null}
    </>
  );
}
