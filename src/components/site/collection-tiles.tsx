import Link from "next/link";
import { AUDIENCES, GOALS } from "@/lib/taxonomy";

/**
 * Плитки навигации по аудитории («Кому») и целям («Зачем»).
 * На мобильном — горизонтальная лента со скролл-снапом и вертикальными
 * отступами (чтобы тень/скругления не обрезались контейнером прокрутки).
 * На десктопе — аккуратная адаптивная сетка.
 */
export function CollectionTiles({ variant }: { variant: "audience" | "goal" }) {
  const items = variant === "audience" ? AUDIENCES : GOALS;
  const base = variant === "audience" ? "/for" : "/goal";
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 sm:py-0 lg:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.slug}
            href={`${base}/${it.slug}`}
            className="group flex w-[155px] shrink-0 snap-start items-center gap-2.5 rounded-2xl bg-surface p-3 ring-1 ring-line transition hover:ring-brand-300 hover:shadow-sm sm:w-auto sm:shrink"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 text-[13px] font-semibold leading-tight text-ink">{it.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
