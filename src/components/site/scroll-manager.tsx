"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { appScrollTo } from "@/lib/app-scroll";

/**
 * Внутренний скроллер #app-scroll не сбрасывается роутером Next.js
 * (тот управляет только window) — прокручиваем его к началу при каждой
 * смене маршрута, чтобы страницы всегда открывались сверху.
 */
export function ScrollManager() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    appScrollTo(0);
  }, [pathname]);

  return null;
}
