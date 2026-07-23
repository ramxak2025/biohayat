"use client";

import * as React from "react";
import { useIsomorphicLayoutEffect, gsap } from "./gsap-core";

/**
 * Обёртка-бейдж, которая «подпрыгивает» при увеличении значения (например,
 * счётчик корзины/избранного). Уважает prefers-reduced-motion.
 */
export function Bump({
  value,
  children,
  className,
}: {
  value: number;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const prev = React.useRef(value);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    const increased = value > prev.current;
    prev.current = value;
    if (!el || !increased) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el,
        { scale: 0.5 },
        { scale: 1, duration: 0.55, ease: "elastic.out(1.2, 0.45)" },
      );
    });
    return () => mm.revert();
  }, [value]);

  return (
    <span ref={ref} className={className} style={{ transformOrigin: "center", display: "inline-flex" }}>
      {children}
    </span>
  );
}
