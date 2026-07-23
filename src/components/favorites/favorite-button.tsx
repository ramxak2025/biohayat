"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "./favorites-provider";
import { cn } from "@/lib/utils";
import { useIsomorphicLayoutEffect, gsap } from "@/components/motion/gsap-core";

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

  const heartRef = React.useRef<SVGSVGElement>(null);
  const prevActive = React.useRef(active);

  // «Поп» + всплеск при добавлении в избранное — эмоциональная обратная связь.
  useIsomorphicLayoutEffect(() => {
    const el = heartRef.current;
    if (!el) return;
    const justAdded = active && !prevActive.current;
    prevActive.current = active;
    if (!justAdded) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el,
        { scale: 0.6 },
        { scale: 1, duration: 0.5, ease: "elastic.out(1.1, 0.5)" },
      );
    });
    return () => mm.revert();
  }, [active]);

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
      <Heart ref={heartRef} className={cn(icon, active && "fill-sale")} strokeWidth={2.2} style={{ transformOrigin: "center" }} />
    </button>
  );
}
