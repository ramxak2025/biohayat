"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

/** Позиция заказа для повторного добавления в корзину. */
export interface ReorderItem {
  productId: string | null;
  slug: string | null;
  name: string;
  priceKopecks: number;
  image: string | null;
  qty: number;
}

/**
 * Кнопка «Повторить заказ»: добавляет доступные позиции заказа в корзину
 * (через клиентский cart-provider) и переходит в корзину.
 */
export function ReorderButton({
  items,
  size = "sm",
  variant = "outline",
  className,
  label = "Повторить",
}: {
  items: ReorderItem[];
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
  label?: string;
}) {
  const { add } = useCart();
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleClick() {
    // Берём только позиции, у которых сохранился товар (есть productId и slug).
    const available = items.filter((i) => i.productId && i.slug);
    if (available.length === 0) {
      toast.error("Товары из этого заказа больше недоступны");
      return;
    }
    for (const it of available) {
      add(
        {
          id: it.productId!,
          slug: it.slug!,
          name: it.name,
          priceKopecks: it.priceKopecks,
          image: it.image,
        },
        it.qty,
      );
    }
    const skipped = items.length - available.length;
    toast.success(
      skipped > 0
        ? `Добавлено ${available.length} поз. (${skipped} недоступно)`
        : "Товары добавлены в корзину",
    );
    start(() => router.push("/cart"));
  }

  return (
    <Button type="button" size={size} variant={variant} disabled={pending} onClick={handleClick} className={cn(className)}>
      <RotateCw className="h-4 w-4" /> {label}
    </Button>
  );
}
