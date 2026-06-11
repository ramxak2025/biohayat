"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { appScrollTop, appScrollTo, onAppScroll } from "@/lib/app-scroll";

/**
 * Кнопка «Наверх»: появляется после 600px скролла, плавно прокручивает
 * к началу страницы. На мобильных поднята над нижним меню.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVisible(appScrollTop() > 600));
    };
    onScroll();
    const off = onAppScroll(onScroll);
    return () => {
      cancelAnimationFrame(raf);
      off();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => appScrollTo(0, true)}
      aria-label="Наверх"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "back-to-top fixed right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink shadow-md ring-1 ring-line backdrop-blur transition-all duration-300 hover:text-brand-700 hover:shadow-lg active:scale-95 lg:right-6",
        "bottom-[calc(var(--spacing-mobnav)+max(10px,env(safe-area-inset-bottom))+10px)] lg:bottom-6",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
