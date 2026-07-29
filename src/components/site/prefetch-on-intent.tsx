"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Предзагрузка страницы по намерению, а не «на всякий случай».
 *
 * Штатный <Link> предзагружает всё, что попало в область экрана. На витрине
 * это сотни ссылок: главная тянула 77 запросов и 669 КБ, каталог — 127
 * запросов и 992 КБ, и всё это до первого клика. Из полусотни товаров в
 * сетке открывают один-два — остальное скачано впустую и отнимает канал у
 * того, что нужно показать сейчас.
 *
 * Поэтому у списочных ссылок prefetch выключен (см. ListLink), а подгрузка
 * включается здесь — при наведении мыши, касании или получении фокуса с
 * клавиатуры. Форы в 200–500 мс между «навёл» и «нажал» хватает, чтобы
 * переход остался мгновенным.
 *
 * Один слушатель на документ вместо обёртки у каждой ссылки: 180 клиентских
 * компонентов на странице каталога стоили бы дороже, чем экономят.
 */
export function PrefetchOnIntent() {
  const router = useRouter();

  React.useEffect(() => {
    const done = new Set<string>();

    const consider = (target: EventTarget | null) => {
      const el = (target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!el) return;
      // Только внутренние переходы: внешние ссылки, файлы, якори и
      // «открыть в новой вкладке» роутер Next не обслуживает.
      if (el.target && el.target !== "_self") return;
      if (el.hasAttribute("download")) return;
      const href = el.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      if (done.has(href)) return;
      done.add(href);
      router.prefetch(href);
    };

    const onOver = (e: Event) => consider(e.target);
    const opts = { capture: true, passive: true } as const;
    document.addEventListener("mouseover", onOver, opts);
    document.addEventListener("touchstart", onOver, opts);
    document.addEventListener("focusin", onOver, opts);
    return () => {
      document.removeEventListener("mouseover", onOver, opts);
      document.removeEventListener("touchstart", onOver, opts);
      document.removeEventListener("focusin", onOver, opts);
    };
  }, [router]);

  return null;
}
