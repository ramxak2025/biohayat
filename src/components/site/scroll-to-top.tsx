"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * При переходе между разделами прокручивает страницу в самый верх,
 * чтобы новый раздел всегда открывался сначала (а не с прежней позиции).
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // мгновенно, без плавности — чтобы не было «рывка» при смене страницы
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
