"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import {
  discountAgainstRetail,
  nextTier,
  type Tier,
} from "@/components/opt/price-math";

/** Степпер количества: − / input / +. Плотный, B2B-стиль. */
export function PriceStepper({
  qty,
  onChange,
  className,
}: {
  qty: number;
  onChange: (qty: number) => void;
  className?: string;
}) {
  // Локальный текст инпута: позволяем временно пустую строку при наборе.
  const [text, setText] = useState(String(qty));
  useEffect(() => setText(String(qty)), [qty]);

  const commit = (raw: string) => {
    const n = Math.min(Math.max(Math.floor(Number(raw) || 0), 0), 10000);
    onChange(n);
    setText(String(n));
  };

  return (
    <div
      className={cn(
        "inline-flex h-9 items-stretch overflow-hidden rounded-lg bg-surface ring-1 ring-line-strong",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Уменьшить количество"
        className="flex w-8 items-center justify-center text-ink-muted transition-colors hover:bg-surface-soft active:bg-surface-sunken disabled:opacity-40"
        disabled={qty <= 0}
        onClick={() => onChange(Math.max(0, qty - 1))}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label="Количество, шт"
        className="tnum w-12 border-x border-line bg-transparent text-center text-sm font-bold outline-none"
        value={text}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 5);
          setText(v);
          if (v !== "") commit(v);
        }}
        onBlur={() => commit(text)}
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        aria-label="Увеличить количество"
        className="flex w-8 items-center justify-center text-brand-700 transition-colors hover:bg-brand-50 active:bg-brand-100"
        onClick={() => onChange(Math.min(10000, qty + 1))}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Подсказка-прогресс до следующего порога лесенки:
 * «+8 шт → 540 ₽/шт (−38%)» + тонкий прогресс-бар.
 * При достижении порога — короткая «вспышка» (подсветка съезжает transition'ом).
 */
export function NextTierHint({
  retailKopecks,
  tiers,
  qty,
  className,
}: {
  retailKopecks: number;
  tiers: Tier[];
  qty: number;
  className?: string;
}) {
  const next = nextTier(tiers, qty);

  // Вспышка при пересечении порога: число достигнутых порогов выросло.
  const reached = tiers.filter((t) => qty >= t.minQty).length;
  const prevReached = useRef(reached);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (reached > prevReached.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
    prevReached.current = reached;
  }, [reached]);
  useEffect(() => {
    prevReached.current = reached;
  });

  if (qty <= 0) return null;

  if (!next) {
    // Максимальный порог достигнут — фиксируем выгоду.
    const best = tiers.length ? Math.min(...tiers.map((t) => t.priceKopecks)) : retailKopecks;
    const pct = discountAgainstRetail(retailKopecks, best);
    return (
      <div
        className={cn(
          "rounded-md text-[11px] font-semibold leading-4 text-brand-700 transition-colors duration-500",
          flash && "bg-brand-100",
          className,
        )}
      >
        Лучшая цена{pct > 0 ? ` (−${pct}%)` : ""} ✓
      </div>
    );
  }

  const need = next.minQty - qty;
  const pct = discountAgainstRetail(retailKopecks, next.priceKopecks);
  const progress = Math.min(100, Math.round((qty / next.minQty) * 100));

  return (
    <div className={cn("min-w-0", className)}>
      <div className="tnum truncate text-[11px] font-semibold leading-4 text-ink-muted">
        +{need} шт → <span className="text-brand-700">{formatMoney(next.priceKopecks)}/шт</span>
        {pct > 0 ? <span className="text-brand-700"> (−{pct}%)</span> : null}
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-brand-400 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
