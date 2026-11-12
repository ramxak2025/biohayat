import { ListLink as Link } from "@/components/ui/list-link";
import { Tag } from "lucide-react";
import { GOALS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

export function GoalCollections({ variant = "rail" }: { variant?: "rail" | "grid" }) {
  const rail = variant === "rail";
  return (
    <div
      className={cn(
        rail
          ? "no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1"
          : "grid grid-cols-3 gap-3 xl:grid-cols-4",
      )}
    >
      {/* Распродажа — первая, фирменный sale-градиент */}
      <Link
        href="/sale"
        className={cn(
          "group relative flex flex-col justify-between overflow-hidden rounded-2xl p-3.5 bg-ink text-mist transition active:scale-[0.98]",
          rail ? "h-28 w-36 shrink-0 snap-start" : "h-28",
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Tag className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-extrabold leading-tight">
          Распродажа
        </span>
      </Link>

      {GOALS.map((g) => {
        const Icon = g.icon;
        return (
          <Link
            key={g.slug}
            href={`/goal/${g.slug}`}
            className={cn(
              "group relative flex flex-col justify-between overflow-hidden rounded-2xl p-3.5 bg-mist-2 transition active:scale-[0.98]",
              rail ? "h-28 w-36 shrink-0 snap-start" : "h-28",
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-brand-700 shadow-xs">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-extrabold leading-tight text-ink">{g.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
