"use client";

import { SmartImage } from "@/components/ui/smart-image";
import { cn, formatMoney } from "@/lib/utils";
import {
  maxDiscountPercent,
  unitPriceForQty,
  type PriceItem,
} from "@/components/opt/price-math";
import { NextTierHint, PriceStepper } from "@/components/opt/price-stepper";

/** Карточка позиции прайса (мобайл): фото, бейдж скидки, лесенка чипсами, степпер, сумма. */
export function PriceCard({
  item,
  qty,
  onQty,
}: {
  item: PriceItem;
  qty: number;
  onQty: (qty: number) => void;
}) {
  const unit = unitPriceForQty(item.retailKopecks, item.tiers, qty);
  const maxPct = maxDiscountPercent(item.retailKopecks, item.tiers);
  const inRequest = qty > 0;

  return (
    <div
      className={cn(
        "rounded-xl bg-surface p-3 ring-1 transition-colors duration-300",
        inRequest ? "bg-brand-50/50 ring-brand-200" : "ring-line",
      )}
    >
      <div className="flex items-start gap-3">
        <SmartImage
          src={item.image}
          alt={item.name}
          label={item.name}
          ratio="1/1"
          rounded="rounded-lg"
          sizes="56px"
          className="w-14 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-5">{item.name}</div>
              {item.volume ? (
                <div className="text-xs text-ink-faint">{item.volume}</div>
              ) : null}
            </div>
            {maxPct > 0 ? (
              <span className="shrink-0 rounded-full bg-sale-soft px-2 py-0.5 text-[11px] font-bold text-sale">
                до −{maxPct}%
              </span>
            ) : null}
          </div>
          <div className="tnum mt-1 text-xs text-ink-faint">
            Розница: <span className="line-through">{formatMoney(item.retailKopecks)}</span>
          </div>
        </div>
      </div>

      {/* Лесенка чипсами */}
      <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto">
        {item.tiers.map((t, i) => {
          const isCurrent =
            qty >= t.minQty && (!item.tiers[i + 1] || qty < item.tiers[i + 1].minQty);
          return (
            <button
              key={t.minQty}
              type="button"
              onClick={() => onQty(t.minQty)}
              className={cn(
                "tnum shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors duration-300",
                isCurrent
                  ? "bg-brand-50 text-brand-700 ring-brand-300"
                  : "bg-surface text-ink-muted ring-line",
              )}
            >
              от {t.minQty} · {formatMoney(t.priceKopecks)}
            </button>
          );
        })}
      </div>

      {/* Степпер + сумма */}
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <PriceStepper qty={qty} onChange={onQty} />
        <div className="text-right">
          {inRequest ? (
            <>
              <div className="tnum text-[11px] leading-4 text-ink-muted">
                {formatMoney(unit)}/шт
              </div>
              <div key={unit * qty} className="tnum animate-fade-up text-base font-extrabold">
                {formatMoney(unit * qty)}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-full bg-brand-500 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-600 active:bg-brand-700"
              onClick={() => onQty(item.tiers[0]?.minQty ?? 1)}
            >
              В заявку
            </button>
          )}
        </div>
      </div>

      <NextTierHint
        retailKopecks={item.retailKopecks}
        tiers={item.tiers}
        qty={qty}
        className="mt-2"
      />
    </div>
  );
}
