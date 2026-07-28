"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { useIsomorphicLayoutEffect, gsap } from "@/components/motion/gsap-core";

/**
 * Текстовая часть героя с входной анимацией.
 *
 * Анимация запускается при монтировании и не зависит от прокрутки — герой и так
 * на первом экране. Уважает prefers-reduced-motion: при reduce ничего не
 * скрывается и не двигается. Разметка отрисовывается сервером, поэтому без JS
 * текст виден сразу (важно для поиска и медленных сетей).
 */
export function HeroIntro({
  title,
  subtitle,
  ctaLabel,
  link,
}: {
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  link?: string | null;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const items = el.querySelectorAll("[data-hero-item]");
      gsap.set(items, { autoAlpha: 0, y: 18 });
      gsap.to(items, {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.09,
        delay: 0.05,
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={ref} className="max-w-xl">
      <span
        data-hero-item
        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur sm:text-xs"
      >
        <Leaf className="h-3.5 w-3.5" aria-hidden /> Натурально · Проверено временем
      </span>

      <h1
        data-hero-item
        className="mt-3 text-[28px] font-extrabold leading-tight sm:text-4xl lg:text-5xl"
      >
        {title || "Витамины и фитопродукция для всей семьи"}
      </h1>

      <p data-hero-item className="mt-2.5 max-w-md text-sm text-white/85 sm:text-base lg:text-lg">
        {subtitle || "Свой состав, свои стандарты, своё производство в России — с 2005 года"}
      </p>

      <div data-hero-item className="mt-5 flex flex-wrap items-center gap-2 sm:mt-7 sm:gap-3">
        {/* «Магнитная» кнопка — только для мыши, на тач-устройствах не мешает тапу */}
        <Magnetic>
          <Button
            asChild
            variant="secondary"
            className="bg-white text-brand-700 shadow-sm hover:bg-white/90"
          >
            <Link href={link || "/catalog"}>
              {ctaLabel || "Подобрать средство"} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </Magnetic>
        <Link
          href="/sale"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-white/90 ring-1 ring-white/30 transition hover:bg-white/10 hover:text-white"
        >
          Со скидкой до −40% <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
