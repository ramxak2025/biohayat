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
      return { gsap };
    });
  }
  return scrollTriggerReady;
}

export { gsap };
