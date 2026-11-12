import type { CatalogDirection } from "../../../shared/catalog-directions";
import { cn } from "@/lib/utils";

export function DirectionMark({ direction, dark, className }: {
  direction: CatalogDirection;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("direction-mark", dark && "direction-mark--dark", className)}
      data-direction={direction.id}
    >
      <span className="direction-dot" aria-hidden="true" />
      {direction.label}
    </span>
  );
}
