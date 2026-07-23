"use client";

import { useRef, useState } from "react";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";
import { useIsomorphicLayoutEffect, gsap } from "@/components/motion/gsap-core";

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

  // Кроссфейд при смене кадра (сдержанно; уважает reduced-motion).
  useIsomorphicLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(el, { autoAlpha: 0.35, scale: 1.02 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power2.out" });
    });
    return () => mm.revert();
  }, [active]);

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto sm:flex-col">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Показать фото ${i + 1} из ${images.length}`}
              aria-pressed={i === active}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 transition duration-200 hover:-translate-y-0.5",
                i === active ? "ring-brand-500" : "ring-line hover:ring-brand-300",
              )}
            >
              <SmartImage src={img.url} alt={img.alt || `${name} — фото ${i + 1}`} ratio="1/1" rounded="rounded-none" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="group flex-1 overflow-hidden rounded-2xl">
        <div ref={mainRef}>
          <SmartImage
            src={current?.url}
            alt={current?.alt || name}
            ratio="1/1"
            rounded="rounded-2xl"
            label={name}
            spec="1000×1000 (1:1)"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            imgClassName="transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.12]"
          />
        </div>
      </div>
    </div>
  );
}
