"use client";

import { useEffect, useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/components/cart/cart-provider";

/**
 * Мобильная закреплённая панель покупки на странице товара.
 * Появляется, когда основная кнопка «В корзину» (элемент с id={targetId})
 * уходит из viewport. Располагается над нижним мобильным меню
 * (var(--spacing-mobnav) + safe-area).
 */
export function StickyBuyBar({
  item,
  oldPriceKopecks,
  inStock = true,
  targetId = "buy-area",
}: {
  item: Omit<CartItem, "qty">;
  oldPriceKopecks?: number | null;
  inStock?: boolean;
  targetId?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  if (!inStock) return null;

  return (
    <div
      aria-hidden={!visible}
      data-visible={visible}
      className={cn(
        "sticky-buy-bar fixed inset-x-0 z-30 px-3 transition-all duration-300 md:hidden",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
      )}
      style={{
        bottom: "calc(var(--spacing-mobnav) + max(10px, env(safe-area-inset-bottom)) + 10px)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[460px] items-center gap-3 rounded-3xl bg-surface/95 p-2.5 pl-4 shadow-lg ring-1 ring-line backdrop-blur">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="tnum text-lg font-extrabold leading-tight text-ink">
              {formatMoney(item.priceKopecks)}
            </span>
            {oldPriceKopecks ? (
              <span className="tnum text-sm font-medium text-ink-faint line-through">
                {formatMoney(oldPriceKopecks)}
              </span>
            ) : null}
          </div>
          <div className="truncate text-xs text-ink-muted">{item.name}</div>
        </div>
        <div className="shrink-0">
          <AddToCartButton item={item} size="md" />
        </div>
      </div>
    </div>
  );
}
