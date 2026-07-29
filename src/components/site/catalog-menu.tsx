"use client";

import * as React from "react";
import { ListLink as Link } from "@/components/ui/list-link";
import { LayoutGrid, ChevronDown, Mars, Venus, Baby, ListChecks } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useIsomorphicLayoutEffect, gsap } from "@/components/motion/gsap-core";
import { cn } from "@/lib/utils";

export interface CatalogMenuCategory {
  slug: string;
  name: string;
}

const AUDIENCES = [
  { href: "/for/men", label: "Мужчинам", icon: Mars },
  { href: "/for/women", label: "Женщинам", icon: Venus },
  { href: "/for/kids", label: "Детям", icon: Baby },
];

/**
 * Кнопка «Каталог» с панелью на всю ширину контейнера.
 *
 * Зачем панель, а не отдельная строка навигации: категорий 17, в строку они не
 * помещались — приходилось либо резать список произвольным числом, либо держать
 * горизонтальный скролл с обрывами названий. Панель отдаёт все категории сразу
 * и освобождает целую строку в шапке.
 *
 * Открытие по клику, не по наведению: случайное раскрытие на полэкрана при
 * проходе курсора — частая причина раздражения. Закрытие — Esc, клик вне, выбор
 * пункта.
 */
export function CatalogMenu({ categories }: { categories: CatalogMenuCategory[] }) {
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Esc и клик вне панели
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // Появление панели: короткое, без «прыжка» — 140 мс и сдвиг на 6px.
  useIsomorphicLayoutEffect(() => {
    const el = panelRef.current;
    if (!el || !open) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: -6 },
        { autoAlpha: 1, y: 0, duration: 0.14, ease: "power2.out" },
      );
      gsap.fromTo(
        el.querySelectorAll("[data-menu-item]"),
        { autoAlpha: 0, y: 4 },
        { autoAlpha: 1, y: 0, duration: 0.22, ease: "power2.out", stagger: { amount: 0.18 } },
      );
    });
    return () => mm.revert();
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-12 items-center gap-2 rounded-full bg-brand-500 px-5 text-base font-bold text-white transition hover:bg-brand-600 active:scale-[0.98]"
      >
        <LayoutGrid className="h-5 w-5" aria-hidden />
        Каталог
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <>
          {/* Затемнение страницы под панелью — фокус на выборе */}
          <div className="fixed inset-x-0 top-[var(--header-h,109px)] bottom-0 z-30 bg-ink/40" aria-hidden />
          <div
            ref={panelRef}
            className="fixed inset-x-0 top-[var(--header-h,109px)] z-40 border-t border-line bg-surface shadow-lg"
          >
            <Container className="max-h-[min(560px,calc(100dvh-var(--header-h,109px)-24px))] overflow-y-auto py-8">
              <div className="grid grid-cols-[1fr_260px] gap-10">
                <div>
                  <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-faint">
                    Категории
                  </h2>
                  <ul className="grid grid-cols-3 gap-x-8 gap-y-1">
                    {categories.map((c) => (
                      <li key={c.slug} data-menu-item>
                        <Link
                          href={`/category/${c.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex min-h-11 items-center rounded-xl px-3 text-[15px] font-medium text-ink transition hover:bg-brand-50 hover:text-brand-700"
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-l border-line pl-10">
                  <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-faint">
                    Кому подбираем
                  </h2>
                  <ul className="space-y-1">
                    {AUDIENCES.map(({ href, label, icon: Icon }) => (
                      <li key={href} data-menu-item>
                        <Link
                          href={href}
                          onClick={() => setOpen(false)}
                          className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-[15px] font-medium text-ink transition hover:bg-brand-50 hover:text-brand-700"
                        >
                          <Icon className="h-[18px] w-[18px] text-brand-600" aria-hidden />
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/quiz"
                    onClick={() => setOpen(false)}
                    data-menu-item
                    className="mt-6 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 transition hover:bg-brand-100"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
                      <ListChecks className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-[15px] font-bold text-ink">Не знаете, что выбрать?</span>
                      <span className="mt-0.5 block text-sm text-ink-muted">
                        Подбор за 1 минуту — три коротких вопроса
                      </span>
                    </span>
                  </Link>
                </div>
              </div>
            </Container>
          </div>
        </>
      ) : null}
    </div>
  );
}
