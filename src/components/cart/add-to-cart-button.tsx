"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartItem } from "./cart-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  item,
  size = "md",
  full,
}: {
  item: Omit<CartItem, "qty">;
  size?: "sm" | "md" | "lg";
  full?: boolean;
}) {
  const { add, items, setQty } = useCart();
  const inCart = items.find((i) => i.id === item.id);
  const [justAdded, setJustAdded] = useState(false);

  if (inCart) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-between rounded-full bg-brand-50 p-1",
          full && "w-full",
        )}
      >
        <button
          onClick={() => setQty(item.id, inCart.qty - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-brand-700 shadow-xs transition hover:bg-brand-100"
          aria-label="Уменьшить"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-8 text-center font-bold text-brand-700">{inCart.qty}</span>
        <button
          onClick={() => add(item)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white shadow-xs transition hover:bg-brand-600"
          aria-label="Увеличить"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <Button
      size={size}
      className={cn(full && "w-full")}
      onClick={() => {
        add(item);
        setJustAdded(true);
        toast.success("Добавлено в корзину", { description: item.name });
        setTimeout(() => setJustAdded(false), 1200);
      }}
    >
      {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
      В корзину
    </Button>
  );
}
