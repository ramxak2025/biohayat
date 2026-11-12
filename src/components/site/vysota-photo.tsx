import Image from "next/image";
import type { CatalogDirectionId } from "../../../shared/catalog-directions";
import { cn } from "@/lib/utils";

export function VysotaPhoto({ scene, primary, className }: {
  scene: "hero" | CatalogDirectionId;
  primary?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={`/vysota/hayat-${scene}.webp`}
      alt=""
      fill
      sizes={primary ? "100vw" : "(max-width: 639px) 132px, (max-width: 1023px) 50vw, 25vw"}
      fetchPriority={primary ? "high" : undefined}
      loading={primary ? "eager" : "lazy"}
      className={cn("vysota-photo", className)}
    />
  );
}
