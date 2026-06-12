"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, PiggyBank, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Интерактивный калькулятор выгоды для оптового лендинга.
 * Типовая лесенка скидок (ориентир до одобрения заявки):
 *   от 10 шт — −20%, от 50 — −30%, от 100 — −38%.
 * Точные цены по каждой позиции — в прайс-листе после одобрения менеджером
 * (лесенки реальных товаров считает src/lib/wholesale.ts).
 */

const TIERS = [
  { minQty: 10, discount: 0.2 },
  { minQty: 50, discount: 0.3 },
  { minQty: 100, discount: 0.38 },
] as const;

const QTY_MIN = 10;
const QTY_MAX = 500;
const QTY_STEP = 10;

const fmtInt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

/** Плавный «перекат» числа к новому значению (ease-out cubic, ~0.35 c). */
function useAnimatedNumber(target: number, duration = 350): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      current.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function Rub({ value, className }: { value: number; className?: string }) {
  const animated = useAnimatedNumber(value);
  return (
    <span className={cn("tnum tabular-nums transition-colors", className)}>
      {fmtInt.format(Math.round(animated))}&nbsp;₽
    </span>
  );
}

export function MarginCalculator() {
  const [qty, setQty] = useState(50);
  const [priceRaw, setPriceRaw] = useState("750");

  const price = Math.max(0, Number(priceRaw.replace(",", ".")) || 0);

  // Текущая и следующая ступени лесенки
  const tier = [...TIERS].reverse().find((t) => qty >= t.minQty) ?? TIERS[0];
  const next = TIERS.find((t) => qty < t.minQty) ?? null;

  const retailTotal = qty * price; // закупка по розничным ценам = выручка при перепродаже
  const purchase = retailTotal * (1 - tier.discount);
  const savings = retailTotal - purchase;
  const profit = retailTotal - purchase; // прибыль при продаже в розницу

  // Прогресс до следующего порога скидки (внутри текущего сегмента лесенки)
  const progress = next
    ? Math.round(((qty - tier.minQty) / (next.minQty - tier.minQty)) * 100)
    : 100;
  const sliderPercent = ((qty - QTY_MIN) / (QTY_MAX - QTY_MIN)) * 100;

  return (
    <div className="rounded-3xl bg-surface p-5 shadow-md ring-1 ring-line sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_1.3fr] lg:gap-10">
        {/* ── Входные данные ── */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="calc-qty" className="text-sm font-bold text-ink">
              Закупка, шт/мес
            </label>
            <output
              htmlFor="calc-qty"
              className="tnum rounded-full bg-brand-50 px-3 py-1 text-sm font-extrabold text-brand-800"
            >
              {qty} шт · −{Math.round(tier.discount * 100)}%
            </output>
          </div>
          <input
            id="calc-qty"
            type="range"
            min={QTY_MIN}
            max={QTY_MAX}
            step={QTY_STEP}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            aria-label="Объём закупки в штуках в месяц"
            style={{
              background: `linear-gradient(to right, var(--color-accent-400) ${sliderPercent}%, var(--color-line) ${sliderPercent}%)`,
            }}
            className={cn(
              "mt-4 h-2 w-full cursor-pointer appearance-none rounded-full outline-none",
              // ползунок: белая «таблетка» с янтарным кольцом
              "[&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none",
              "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-accent-400",
              "[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform",
              "[&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-95",
              "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full",
              "[&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-accent-400 [&::-moz-range-thumb]:bg-white",
              "[&::-moz-range-thumb]:shadow-md",
            )}
          />
          {/* Подписи лесенки под слайдером */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {TIERS.map((t) => (
              <span
                key={t.minQty}
                className={cn(
                  "tnum rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
                  qty >= t.minQty
                    ? "bg-brand-600 text-white"
                    : "bg-surface-soft text-ink-faint",
                )}
              >
                от {t.minQty} шт → −{Math.round(t.discount * 100)}%
              </span>
            ))}
          </div>

          <div className="mt-6">
            <label htmlFor="calc-price" className="text-sm font-bold text-ink">
              Средняя розничная цена товара, ₽
            </label>
            <div className="relative mt-2">
              <input
                id="calc-price"
                type="number"
                inputMode="numeric"
                min={0}
                max={100000}
                value={priceRaw}
                onChange={(e) => setPriceRaw(e.target.value)}
                className="tnum w-full rounded-xl border border-line-strong bg-surface px-4 py-2.5 pr-10 text-[15px] font-semibold text-ink transition-colors placeholder:text-ink-faint focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <span
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-ink-faint"
                aria-hidden="true"
              >
                ₽
              </span>
            </div>
          </div>

          {/* Прогресс до следующего порога скидки */}
          <div className="mt-6 rounded-2xl bg-surface-soft p-4">
            <p className="text-sm font-semibold text-ink">
              {next ? (
                <>
                  Ещё{" "}
                  <span className="tnum font-extrabold text-accent-700">
                    {next.minQty - qty} шт
                  </span>{" "}
                  — и скидка{" "}
                  <span className="font-extrabold text-accent-700">
                    −{Math.round(next.discount * 100)}%
                  </span>
                </>
              ) : (
                <>
                  У вас максимальная скидка{" "}
                  <span className="font-extrabold text-brand-700">−38%</span>
                </>
              )}
            </p>
            <div
              className="mt-2.5 h-2 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Прогресс до следующего порога скидки"
            >
              <div
                className="h-full rounded-full bg-linear-to-r from-accent-300 to-accent-500 transition-all duration-500 [transition-timing-function:var(--ease-out-soft)]"
                style={{ width: `${Math.max(6, progress)}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Три больших числа ── */}
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
              <ShoppingBasket className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Ваша закупка
            </p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              <Rub value={purchase} />
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              {qty} шт по цене со скидкой −{Math.round(tier.discount * 100)}%
            </p>
          </div>

          <div className="rounded-2xl bg-brand-800 p-5 text-white shadow-brand">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-100">
              <PiggyBank className="h-4 w-4 text-accent-300" aria-hidden="true" />
              Экономия против розницы
            </p>
            <p className="mt-2 flex flex-wrap items-baseline gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              <Rub value={savings} />
              <span className="rounded-full bg-accent-400 px-2 py-0.5 text-sm font-bold text-white">
                −{Math.round(tier.discount * 100)}%
              </span>
            </p>
            <p className="mt-1 text-xs text-brand-200">
              каждый месяц остаётся в вашем бизнесе
            </p>
          </div>

          <div className="rounded-2xl bg-surface-soft p-5 sm:col-span-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
              <TrendingUp className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Потенциальная выручка при продаже в розницу
            </p>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                <Rub value={retailTotal} />
              </span>
              <span className="text-base font-bold text-brand-700 sm:text-lg">
                → прибыль <Rub value={profit} />/мес
              </span>
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
        Расчёт ориентировочный, по типовой лесенке оптовых скидок. Точные цены по
        каждой из 119+ позиций откроются в персональном прайс-листе после
        одобрения заявки менеджером — обычно это занимает один рабочий день.
      </p>
    </div>
  );
}
