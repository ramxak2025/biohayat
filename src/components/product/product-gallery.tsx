"use client";

import { useRef, useState } from "react";
import { SmartImage } from "@/components/ui/smart-image";
import { useIsomorphicLayoutEffect, gsap } from "@/components/motion/gsap-core";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  name,
}: {
  images: { url: string; alt?: string | null }[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active];
  const mainRef = useRef<HTMLDivElement>(null);

  // Мягкое проявление главного фото при переключении миниатюры.
  useIsomorphicLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el,
        { autoAlpha: 0.35, scale: 1.02 },
        { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power2.out" },
      );
    });
    return () => mm.revert();
  }, [active]);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div ref={mainRef} className="min-w-0 flex-1">
        <SmartImage
          src={current?.url}
          alt={current?.alt || name}
          ratio="1/1"
          rounded="product-main-image"
          className="bg-[var(--direction-p)]"
          imgClassName="object-contain p-[6%]"
          label={name}
          spec="1000×1000 (1:1)"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      {images.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto p-1 sm:gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Фото ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-xl bg-[var(--direction-p)] transition sm:size-24",
                i === active
                  ? "ring-2 ring-brand-500"
                  : "ring-1 ring-line hover:ring-brand-300",
              )}
            >
              <SmartImage src={img.url} alt={img.alt || name} ratio="1/1" rounded="rounded-none" className="bg-[var(--direction-p)]" imgClassName="object-contain p-1" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
