"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchTrigger, SearchOverlay } from "@/components/site/mobile-search";
import { cn } from "@/lib/utils";

/**
 * Мобильная шапка в стиле приложения: логотип и поиск в ОДНОЙ строке.
 *
 * Высота шапки постоянная — ничего не сворачивается и не меняет размер
 * при скролле (прежняя схема со скрытием строки логотипа меняла высоту
 * во время прокрутки, сдвигала контент и шапка «дёргалась»). Единственный
 * эффект — лёгкая тень при прокрутке, она высоту не трогает.
 *
 * Safe-area: отдельный спейсер высотой env(safe-area-inset-top) внутри
 * закрашенного контейнера — капсула никогда не ныряет под статус-бар,
 * даже когда Safari сворачивает/разворачивает свою панель.
 */
export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 6);
        ticking = false;
      });
    };
    onScroll();
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

        <div className="flex items-center gap-2.5 px-3 py-2">
          {/* Компактный логотип: знак + ХАЯТ */}
          <Link
            href="/"
            aria-label="ХАЯТ — на главную"
            className="flex shrink-0 items-center gap-1.5 active:scale-95"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-brand">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M12 2C7 6 4 10 4 14a8 8 0 0016 0c0-4-3-8-8-12zm0 5c2.5 2.2 4 4.7 4 7a4 4 0 01-8 0c0-2.3 1.5-4.8 4-7z" />
              </svg>
            </span>
            <span className="text-lg font-extrabold tracking-tight text-ink">ХАЯТ</span>
          </Link>

          {/* Поиск занимает остаток строки */}
          <div className="min-w-0 flex-1">
            <SearchTrigger onOpen={() => setOpen(true)} compact />
          </div>
        </div>
      </header>

      {open ? <SearchOverlay onClose={() => setOpen(false)} /> : null}
    </>
  );
}
