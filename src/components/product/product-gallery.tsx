"use client";

import { useState } from "react";
import { SmartImage } from "@/components/ui/smart-image";
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

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto sm:flex-col">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 transition",
                i === active ? "ring-brand-500" : "ring-line hover:ring-brand-300",
              )}
            >
              <SmartImage src={img.url} alt={img.alt || name} ratio="1/1" rounded="rounded-none" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex-1">
        <SmartImage
          src={current?.url}
          alt={current?.alt || name}
          ratio="1/1"
          rounded="rounded-2xl"
          label={name}
          spec="1000×1000 (1:1)"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    </div>
  );
}
