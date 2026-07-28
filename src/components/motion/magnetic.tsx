"use client";

import * as React from "react";
import { useIsomorphicLayoutEffect, gsap } from "./gsap-core";

/**
 * Магнитный элемент: слегка «притягивается» к курсору. Только на устройствах
 * с точным указателем и при отсутствии prefers-reduced-motion.
 * Обёртка inline-block, чтобы не ломать раскладку кнопок/ссылок.
 */
export function Magnetic({
  children,
  className,
  strength = 0.35,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      () => {
        const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
        const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });

        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const relX = e.clientX - (r.left + r.width / 2);
          const relY = e.clientY - (r.top + r.height / 2);
          xTo(relX * strength);
          yTo(relY * strength);
        };
        const onLeave = () => {
          xTo(0);
          yTo(0);
        };

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      },
    );

    return () => mm.revert();
  }, [strength]);

  return (
    <span ref={ref} className={className} style={{ display: "inline-block", willChange: "transform" }}>
      {children}
    </span>
  );
}
