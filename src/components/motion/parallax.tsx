"use client";

import * as React from "react";
import { useIsomorphicLayoutEffect, ensureScrollTrigger } from "./gsap-core";

/**
 * Мягкий скролл-параллакс для фоновой картинки. Внутренний слой чуть увеличен,
 * чтобы сдвиг не обнажал края. Сдержанно (MOTION_INTENSITY: 4), с reduced-motion.
 */
export function Parallax({
  children,
  className,
  amount = 60,
}: {
  children: React.ReactNode;
  className?: string;
  amount?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ctx: { revert: () => void } | undefined;

    ensureScrollTrigger().then(({ gsap }) => {
      if (!ref.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          el,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
      ctx = mm;
    });

    return () => ctx?.revert();
  }, [amount]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
