"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "./favorites-provider";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  productId,
  className,
  size = "md",
}: {
  productId: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { has, toggle, ready } = useFavorites();
  const active = ready && has(productId);
  const box = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-label={active ? "Убрать из избранного" : "В избранное"}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center rounded-full bg-surface/90 shadow-sm ring-1 ring-line backdrop-blur transition active:scale-90",
        box,
        active ? "text-sale" : "text-ink-faint hover:text-sale",
        className,
      )}
    >
      <Heart className={cn(icon, active && "fill-sale")} strokeWidth={2.2} />
    </button>
  );
}
