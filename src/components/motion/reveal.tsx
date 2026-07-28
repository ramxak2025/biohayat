"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsomorphicLayoutEffect, gsap } from "./gsap-core";

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
  /** Оставлен для совместимости вызовов; сейчас всегда запуск при монтировании. */
  trigger?: "scroll" | "load";
  /** Задержка перед стартом, сек. */
  delay?: number;
}

/**
 * Плавное появление секции или каскад по её детям.
 *
 * Запускается при монтировании и НЕ зависит от прокрутки. Так сделано намеренно:
 * в мобильной вёрстке страницу прокручивает не окно, а внутренний контейнер
 * (`overflow-y: auto`; на десктопе тот же контейнер становится `display: contents`).
 * ScrollTrigger слушает окно, событий прокрутки на телефоне не получал — и секции
 * ниже первого экрана оставались скрытыми навсегда: посетитель видел заголовок
 * «Категории» и пустоту под ним. Скрытый контент в магазине хуже, чем отсутствие
 * эффекта, поэтому зависимость от прокрутки убрана совсем.
 *
 * Уважает prefers-reduced-motion: при reduce анимация не навешивается и контент
 * виден сразу. Скрытие ставится только на клиенте, поэтому без JS тоже всё видно.
 */
export function Reveal({
  children,
  className,
  as = "div",
  stagger = false,
  step = 0.08,
  y = 24,
  delay = 0,
}: RevealProps) {
  const ref = React.useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const targets = stagger ? Array.from(el.children) : el;
      // Ограничиваем суммарную длительность каскада: даже в большой сетке
      // элементы становятся видимыми/кликабельными быстро (важно для тапа).
      const count = Array.isArray(targets) ? targets.length : 1;
      const staggerCfg = stagger && count > 1 ? { amount: Math.min(count * step, 0.5) } : 0;

      gsap.set(targets, { autoAlpha: 0, y });
      gsap.to(targets, {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        delay,
        stagger: staggerCfg,
      });
    });
    return () => mm.revert();
  }, [stagger, step, y, delay]);

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
