import Link from "next/link";
import { AUDIENCES, GOALS } from "@/lib/taxonomy";

/** Плитки навигации по аудитории («Кому») и целям («Зачем»). */
export function CollectionTiles({ variant }: { variant: "audience" | "goal" }) {
  const items = variant === "audience" ? AUDIENCES : GOALS;
  const base = variant === "audience" ? "/for" : "/goal";
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.slug}
            href={`${base}/${it.slug}`}
            className="group flex w-[172px] shrink-0 items-center gap-2.5 rounded-2xl bg-surface p-3 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto sm:shrink"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
              <Icon className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 text-[13px] font-bold leading-tight">{it.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
