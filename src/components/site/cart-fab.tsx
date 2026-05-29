"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/utils";

/**
 * Плавающая кнопка корзины для мобильных (верхней шапки на мобильном нет).
 * Появляется только когда в корзине есть товары; прячется на самой корзине/чекауте.
 */
export function CartFab() {
  const { count, totalKopecks } = useCart();
  const pathname = usePathname();
  if (count === 0 || pathname === "/cart" || pathname === "/checkout") return null;

  return (
    <Link
      href="/cart"
      className="fixed inset-x-4 bottom-[calc(72px+max(16px,env(safe-area-inset-bottom)))] z-30 flex items-center justify-between rounded-full bg-brand-500 px-5 py-3.5 text-white shadow-brand lg:hidden"
    >
      <span className="flex items-center gap-2.5 font-bold">
        <span className="relative">
          <ShoppingBag className="h-5 w-5" />
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-400 px-1 text-[10px] font-bold ring-2 ring-brand-500">
            {count}
          </span>
        </span>
        В корзину
      </span>
      <span className="font-extrabold">{formatMoney(totalKopecks)}</span>
    </Link>
  );
}
