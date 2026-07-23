"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsomorphicLayoutEffect, ensureScrollTrigger } from "./gsap-core";

type As = "div" | "section" | "ul" | "ol";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Тег-обёртка (по умолчанию div). */
  as?: As;
  /** Анимировать прямых детей каскадом (stagger) вместо блока целиком. */
  stagger?: boolean;
  /** Шаг каскада, сек. */
  step?: number;
  /** Сдвиг по Y на старте, px. */
  y?: number;
  /** Когда запускать: при въезде во вьюпорт ("scroll") или сразу при монтировании ("load"). */
  trigger?: "scroll" | "load";
  /** Задержка перед стартом, сек (для "load"). */
  delay?: number;
}

/**
 * GSAP-ревил: плавное появление секции/сетки при скролле (или при загрузке).
 * Полностью уважает prefers-reduced-motion — при reduce анимация не навешивается,
 * контент виден сразу (gsap.set внутри matchMedia не выполняется).
 * MOTION_INTENSITY: 4 — сдержанно, только transform+opacity.
 */
export function Reveal({
  children,
  className,
  as = "div",
  stagger = false,
  step = 0.08,
  y = 24,
  trigger = "scroll",
  delay = 0,
}: RevealProps) {
  const ref = React.useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ctx: { revert: () => void } | undefined;

    ensureScrollTrigger().then(({ gsap }) => {
      if (!ref.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const targets = stagger ? Array.from(el.children) : el;
        gsap.set(targets, { autoAlpha: 0, y });
        gsap.to(targets, {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          delay: trigger === "load" ? delay : 0,
          stagger: stagger ? step : 0,
          ...(trigger === "scroll"
            ? { scrollTrigger: { trigger: el, start: "top 86%", once: true } }
            : {}),
        });
      });
      ctx = mm;
    });

    return () => ctx?.revert();
  }, [stagger, step, y, trigger, delay]);

  const Tag = as as React.ElementType;
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/** Каскадная сетка: обёртка сама является grid-контейнером, дети появляются волной. */
export function Stagger({
  children,
  className,
  step,
  y,
  trigger,
}: Omit<RevealProps, "stagger" | "as">) {
  return (
    <Reveal className={cn(className)} stagger step={step} y={y} trigger={trigger}>
      {children}
    </Reveal>
  );
}
