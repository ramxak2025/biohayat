import Link from "next/link";
import { AUDIENCES, GOALS } from "@/lib/taxonomy";

/** Плитки навигации по аудитории («Кому») и целям («Зачем»). */
export function CollectionTiles({ variant }: { variant: "audience" | "goal" }) {
  const items = variant === "audience" ? AUDIENCES : GOALS;
  const base = variant === "audience" ? "/for" : "/goal";
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.slug}
            href={`${base}/${it.slug}`}
            className="group flex min-w-[140px] items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md sm:min-w-0"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
              <Icon className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <span className="text-[15px] font-bold leading-tight">{it.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
