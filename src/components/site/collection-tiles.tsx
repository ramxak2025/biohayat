import { ListLink as Link } from "@/components/ui/list-link";
import { AUDIENCES, GOALS } from "@/lib/taxonomy";

/**
 * Чипсы навигации по аудитории («Кому») и целям («Зачем») — фирменные
 * пилюли с иконкой в brand-кружке. На мобильном — горизонтальная лента
 * со скролл-снапом (вертикальные отступы, чтобы тень не обрезалась),
 * на десктопе — аккуратный перенос строк.
 */
export function CollectionTiles({ variant }: { variant: "audience" | "goal" }) {
  const items = variant === "audience" ? AUDIENCES : GOALS;
  const base = variant === "audience" ? "/for" : "/goal";
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.slug}
            href={`${base}/${it.slug}`}
            className="group inline-flex min-h-10 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full bg-surface py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink shadow-xs ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-sm hover:ring-brand-300 active:bg-brand-50"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            {it.name}
          </Link>
        );
      })}
    </div>
  );
}
