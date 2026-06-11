import Link from "next/link";
import { Tag } from "lucide-react";
import { GOALS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/* Палитра карточек-подборок: мягкие природные дуэты, по кругу */
const CARD_DUOS = [
  ["#E7F0E4", "#CFE4C9"],
  ["#F8EFD9", "#EFDDB4"],
  ["#ECEAF6", "#D9D4EE"],
  ["#FBEEE4", "#F2D9C2"],
  ["#E4F2EF", "#C7E4DD"],
  ["#F4F1E8", "#E5DFCC"],
];

/**
 * Подборки-карточки каталога: «Распродажа» + цели («Иммунитет»,
 * «Похудение»…) как крупные карточки с иконкой на мягком градиенте.
 * variant="rail" — горизонтальная snap-лента (мобильный хаб),
 * variant="grid" — сетка (десктопное стартовое окно каталога).
 */
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
          "group relative flex flex-col justify-between overflow-hidden rounded-2xl p-3.5 text-white shadow-xs transition active:scale-[0.98]",
          rail ? "h-28 w-36 shrink-0 snap-start" : "h-28",
        )}
        style={{ background: "linear-gradient(135deg, #D9534F, #B23B38)" }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Tag className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-extrabold leading-tight">
          Распродажа
          <span className="block text-[11px] font-semibold text-white/80">до −40%</span>
        </span>
      </Link>

      {GOALS.map((g, i) => {
        const Icon = g.icon;
        const [from, to] = CARD_DUOS[i % CARD_DUOS.length];
        return (
          <Link
            key={g.slug}
            href={`/goal/${g.slug}`}
            className={cn(
              "group relative flex flex-col justify-between overflow-hidden rounded-2xl p-3.5 shadow-xs ring-1 ring-black/[0.03] transition active:scale-[0.98]",
              rail ? "h-28 w-36 shrink-0 snap-start" : "h-28",
            )}
            style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
          >
            {/* декоративный лист */}
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute -bottom-3 -right-3 h-20 w-20 rotate-12 text-brand-900/[0.07]"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2C7 6 4 10 4 14a8 8 0 0016 0c0-4-3-8-8-12zm0 5c2.5 2.2 4 4.7 4 7a4 4 0 01-8 0c0-2.3 1.5-4.8 4-7z" />
            </svg>
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
