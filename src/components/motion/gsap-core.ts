"use client";

import { useEffect, useLayoutEffect } from "react";
import gsap from "gsap";

/**
 * useLayoutEffect на клиенте, useEffect на сервере — чтобы gsap.set(autoAlpha:0)
 * успевал примениться до отрисовки и не было мигания контента (FOUC).
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

let scrollTriggerReady: Promise<{ gsap: typeof gsap }> | null = null;

/**
 * Лениво подгружает и регистрирует ScrollTrigger один раз на страницу.
 * Возвращает gsap с уже зарегистрированным плагином.
 */
export function ensureScrollTrigger(): Promise<{ gsap: typeof gsap }> {
  if (!scrollTriggerReady) {
    scrollTriggerReady = import("gsap/ScrollTrigger").then((mod) => {
      gsap.registerPlugin(mod.ScrollTrigger);
      watchPageHeight(mod.ScrollTrigger);
      return { gsap };
    });
  }
  return scrollTriggerReady;
}

/**
 * Пересчитывает позиции триггеров, когда меняется высота страницы.
 *
 * Зачем: баннер cookie при загрузке ставит `body { overflow: hidden }` и страница
 * «схлопывается» до высоты экрана. ScrollTrigger успевает посчитать позиции по
 * этой заниженной высоте, запоминает их — и после закрытия баннера триггеры уже
 * не срабатывают. В результате секции ниже первого экрана остаются скрытыми
 * навсегда: видно заголовок и пустоту под ним.
 *
 * ResizeObserver ловит и это, и обычные сдвиги вёрстки при догрузке картинок.
 */
function watchPageHeight(ScrollTrigger: { refresh: () => void }) {
  if (typeof window === "undefined") return;
  let last = document.documentElement.scrollHeight;
  const refresh = () => ScrollTrigger.refresh();

  window.addEventListener("load", refresh, { once: true });
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      const now = document.documentElement.scrollHeight;
      if (Math.abs(now - last) > 100) {
        last = now;
        refresh();
      }
    }).observe(document.documentElement);
  }
}

export { gsap };
