"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Горизонтальная лента чипсов со скролл-снапом и скрытым скроллбаром.
 * После монтирования (и при смене activeKey) прокручивает активную чипсу
 * (элемент с data-active="true") в видимую область — чтобы на странице
 * категории текущая категория была сразу видна, как у Ozon/ВкусВилл.
 */
export function ChipsRow({
  activeKey,
  label,
  className,
  children,
}: {
  /** Ключ активного элемента — при его смене лента перецентровывается. */
  activeKey?: string;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = ref.current;
    if (!row || row.scrollWidth <= row.clientWidth) return;
    const active = row.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    // Считаем смещение вручную (не scrollIntoView), чтобы не дёргать
    // вертикальный скролл страницы при загрузке.
    const target = active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2;
    row.scrollLeft = Math.max(0, target);
  }, [activeKey]);

  return (
    <div
      ref={ref}
      role={label ? "navigation" : undefined}
      aria-label={label}
      onFocus={(event) => {
        const row = event.currentTarget;
        if (row.scrollWidth <= row.clientWidth) return;
        const chip = event.target.getBoundingClientRect();
        const viewport = row.getBoundingClientRect();
        const padding = parseFloat(getComputedStyle(row).scrollPaddingInlineStart) || 0;
        if (chip.left < viewport.left + padding) row.scrollLeft += chip.left - viewport.left - padding;
        else if (chip.right > viewport.right - padding) row.scrollLeft += chip.right - viewport.right + padding;
      }}
      className={cn("no-scrollbar flex snap-x gap-2 overflow-x-auto", className)}
    >
      {children}
    </div>
  );
}
