"use client";

import * as React from "react";
import { useIsomorphicLayoutEffect, ensureScrollTrigger } from "./gsap-core";
import { formatMoney } from "@/lib/utils";

interface CountUpProps {
  to: number;
  /** "int" — целое с разделителями; "money" — сумма в копейках → «1 990 ₽». */
  format?: "int" | "money";
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}

function render(value: number, format: CountUpProps["format"]) {
  if (format === "money") return formatMoney(value);
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

/**
 * Счётчик, который «докручивается» до значения при въезде во вьюпорт.
 * Финальное значение всегда отрисовано в разметке (SSR/SEO/no-JS/reduced-motion),
 * анимация лишь оживляет его.
 */
export function CountUp({
  to,
  format = "int",
  prefix = "",
  suffix = "",
  className,
  duration = 1.4,
}: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const final = `${prefix}${render(to, format)}${suffix}`;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ctx: { revert: () => void } | undefined;

    ensureScrollTrigger().then(({ gsap }) => {
      if (!ref.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const obj = { v: 0 };
        gsap.to(obj, {
          v: to,
          duration,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: () => {
            el.textContent = `${prefix}${render(obj.v, format)}${suffix}`;
          },
        });
      });
      ctx = mm;
    });

    return () => ctx?.revert();
  }, [to, format, prefix, suffix, duration]);

  return (
    <span ref={ref} className={className}>
      {final}
    </span>
  );
}
