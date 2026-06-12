"use client";

import { X } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { cn, formatMoney } from "@/lib/utils";
import { unitPriceForQty, type PriceItem } from "@/components/opt/price-math";
import { NextTierHint, PriceStepper } from "@/components/opt/price-stepper";

/**
 * Строка прайс-таблицы (десктоп). Плотная, всё считается мгновенно на клиенте:
 * цена/шт по лесенке, сумма, прогресс до следующего порога.
 */
export function PriceRow({
  item,
  qty,
  tierCols,
  onQty,
}: {
  item: PriceItem;
  qty: number;
  /** Сколько колонок лесенки рисует таблица (максимум по всем товарам). */
  tierCols: number;
  onQty: (qty: number) => void;
}) {
  const unit = unitPriceForQty(item.retailKopecks, item.tiers, qty);
  const inRequest = qty > 0;

  return (
    <tr
      className={cn(
        "border-b border-line transition-colors duration-300",
        inRequest ? "bg-brand-50/50" : "hover:bg-surface-soft/60",
      )}
    >
      {/* Товар */}
      <td className="py-2.5 pl-4 pr-3">
        <div className="flex min-w-0 items-center gap-3">
          <SmartImage
            src={item.image}
            alt={item.name}
            label={item.name}
            ratio="1/1"
            rounded="rounded-lg"
            sizes="40px"
            className="w-10 shrink-0"
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-5">{item.name}</div>
            {item.volume ? (
              <div className="truncate text-xs text-ink-faint">{item.volume}</div>
            ) : null}
          </div>
        </div>
      </td>

      {/* Розница (зачёркнуто) */}
      <td className="tnum whitespace-nowrap px-3 py-2.5 text-sm text-ink-faint line-through">
        {formatMoney(item.retailKopecks)}
      </td>

      {/* Лесенка: цена за шт по порогам, достигнутый порог подсвечен */}
      {Array.from({ length: tierCols }, (_, i) => {
        const tier = item.tiers[i];
        if (!tier) {
          return (
            <td key={i} className="px-3 py-2.5 text-center text-xs text-ink-faint">
              —
            </td>
          );
        }
        const isCurrent =
          qty >= tier.minQty && (!item.tiers[i + 1] || qty < item.tiers[i + 1].minQty);
        return (
          <td
            key={tier.minQty}
            className={cn(
              "whitespace-nowrap px-3 py-2 text-center transition-colors duration-300",
              isCurrent && "bg-brand-50",
            )}
          >
            <div className={cn("tnum text-sm font-bold", isCurrent ? "text-brand-700" : "text-ink")}>
              {formatMoney(tier.priceKopecks)}
            </div>
            <div className="text-[11px] leading-4 text-ink-faint">от {tier.minQty} шт</div>
          </td>
        );
      })}

      {/* Количество + подсказка следующего порога */}
      <td className="px-3 py-2.5 align-middle">
        <PriceStepper qty={qty} onChange={onQty} />
        <NextTierHint
          retailKopecks={item.retailKopecks}
          tiers={item.tiers}
          qty={qty}
          className="mt-1.5 w-[6.5rem]"
        />
      </td>

      {/* Сумма строки (живо) */}
      <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-sm font-extrabold">
        {qty > 0 ? (
          <span key={unit * qty} className="animate-fade-up inline-block">
            {formatMoney(unit * qty)}
          </span>
        ) : (
          <span className="font-normal text-ink-faint">—</span>
        )}
      </td>

      {/* В заявку / убрать */}
      <td className="py-2.5 pl-1 pr-4 text-right">
        {inRequest ? (
          <button
            type="button"
            aria-label="Убрать из заявки"
            title="Убрать из заявки"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-sunken hover:text-danger"
            onClick={() => onQty(0)}
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-full bg-brand-500 px-3.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-600 active:bg-brand-700"
            onClick={() => onQty(item.tiers[0]?.minQty ?? 1)}
          >
            В заявку
          </button>
        )}
      </td>
    </tr>
  );
}
