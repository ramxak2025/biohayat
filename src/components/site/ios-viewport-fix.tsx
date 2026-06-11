"use client";

import { useEffect } from "react";

/**
 * Лечение известного бага iOS Safari: после закрытия экранной клавиатуры
 * (формы входа, профиля, checkout) визуальный вьюпорт остаётся смещённым,
 * и sticky-шапка с fixed-нижним баром «уезжают» со своих мест до следующего
 * жеста. Принудительный no-op scroll при изменении visualViewport заставляет
 * Safari заново привязать fixed/sticky элементы.
 */
export function IOSViewportFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const reanchor = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Клавиатура закрыта: высота визуального вьюпорта вернулась к окну
        if (Math.abs(window.innerHeight - vv.height) < 60) {
          window.scrollTo(window.scrollX, window.scrollY);
        }
      });
    };
    vv.addEventListener("resize", reanchor);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", reanchor);
    };
  }, []);
  return null;
}
