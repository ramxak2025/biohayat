/**
 * Единая точка работы со скроллом приложения.
 *
 * На мобильном скроллится НЕ body, а внутренний контейнер #app-scroll
 * (см. (site)/layout.tsx и globals.css): прокрутка body в iOS Safari
 * двигает панели браузера, и вместе с ними «плавали» шапка и нижний бар.
 * На десктопе контейнер схлопывается (lg:contents) и скроллится body.
 */

export function getAppScroller(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById("app-scroll");
  if (!el) return null;
  return getComputedStyle(el).overflowY === "auto" ? el : null;
}

export function appScrollTop(): number {
  const el = getAppScroller();
  return el ? el.scrollTop : window.scrollY;
}

export function appScrollTo(top: number, smooth = false): void {
  const target = getAppScroller();
  const opts: ScrollToOptions = { top, behavior: smooth ? "smooth" : "auto" };
  if (target) target.scrollTo(opts);
  else window.scrollTo(opts);
}

/** Подписка на скролл и окна, и контейнера (покрывает мобайл/десктоп и ресайз). */
export function onAppScroll(handler: () => void): () => void {
  window.addEventListener("scroll", handler, { passive: true });
  const el = document.getElementById("app-scroll");
  el?.addEventListener("scroll", handler, { passive: true });
  return () => {
    window.removeEventListener("scroll", handler);
    el?.removeEventListener("scroll", handler);
  };
}
