"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SearchTrigger, SearchOverlay } from "@/components/site/mobile-search";
import { useAuthFlag, useAuthName } from "@/lib/use-auth-flag";
import { appScrollTop, onAppScroll } from "@/lib/app-scroll";
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
  const loggedIn = useAuthFlag();
  const name = useAuthName();

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(appScrollTop() > 6);
        ticking = false;
      });
    };
    onScroll();
    return onAppScroll(onScroll);
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
          "glass glass-extend sticky top-0 z-40 transition-shadow duration-300 lg:hidden",
          scrolled
            ? "shadow-[0_1px_0_rgba(26,29,26,0.07),0_10px_30px_rgba(26,29,26,0.07)]"
            : "shadow-[0_1px_0_rgba(26,29,26,0.04)]",
        )}
      >
        {/* Спейсер safe-area: тянется/сжимается вместе с инсетом Safari */}
        <div style={{ height: "env(safe-area-inset-top, 0px)" }} />

        <div className="flex items-center gap-2.5 px-3 pb-2.5 pt-2.5">
          {/* Компактный логотип: знак + ХАЯТ */}
          <Link
            href="/"
            aria-label="ХАЯТ — на главную"
            className="flex shrink-0 items-center gap-1.5 active:scale-95"
          >
            <Image
              src="/brand/logo-mark.png"
              alt="ХАЯТ"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0"
              priority
            />
            <span className="text-lg font-extrabold tracking-tight text-ink">ХАЯТ</span>
          </Link>

          {/* Поиск занимает остаток строки */}
          <div className="min-w-0 flex-1">
            <SearchTrigger onOpen={() => setOpen(true)} compact />
          </div>

          {/* Аватар клиента → карточка профиля (корзина живёт в нижнем баре) */}
          {loggedIn ? (
            <Link
              href="/account/profile"
              aria-label="Мой профиль"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-base font-extrabold text-white shadow-brand active:scale-95"
            >
              {(name.trim().charAt(0) || "Я").toUpperCase()}
            </Link>
          ) : null}
        </div>
      </header>

      {open ? <SearchOverlay onClose={() => setOpen(false)} /> : null}
    </>
  );
}
