"use client";

import { useEffect, useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { onAppScroll } from "@/lib/app-scroll";
import type { CartItem } from "@/components/cart/cart-provider";

/**
 * Мобильная закреплённая панель покупки на странице товара.
 * Появляется после того, как основной блок покупки проходит под шапкой. Располагается над нижним мобильным меню
 * (var(--spacing-mobnav) + safe-area).
 */
export function StickyBuyBar({
  item,
  oldPriceKopecks,
  inStock = true,
  maxQty = 99,
  targetId = "buy-area",
}: {
  item: Omit<CartItem, "qty">;
  oldPriceKopecks?: number | null;
  inStock?: boolean;
  /** Остаток на складе для лимита степпера (99 — учёт выключен). */
  maxQty?: number;
  targetId?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const header = document.querySelector("#app-scroll > .site-header .site-header-row");
    const update = () => {
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
      setVisible(target.getBoundingClientRect().bottom <= headerBottom);
    };
    update();
    window.addEventListener("resize", update);
    const detachScroll = onAppScroll(update);
    return () => {
      window.removeEventListener("resize", update);
      detachScroll();
    };
  }, [targetId]);

  if (!inStock) return null;

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      data-visible={visible}
      className={cn(
        "sticky-buy-bar fixed inset-x-0 z-30 px-3 transition-opacity duration-300 motion-reduce:transition-none md:hidden",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      style={{
        bottom: "calc(var(--spacing-mobnav) + max(10px, env(safe-area-inset-bottom)) + 10px)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[460px] items-center gap-3 rounded-3xl bg-surface p-2.5 pl-4 shadow-lg ring-1 ring-line ">
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
          <AddToCartButton item={item} size="md" maxQty={maxQty} />
        </div>
      </div>
    </div>
  );
}
