"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { SmartImage } from "@/components/ui/smart-image";
import { formatMoney } from "@/lib/utils";

interface RecentItem {
  id: string;
  slug: string;
  name: string;
  priceKopecks: number;
  image?: string | null;
}

const STORAGE_KEY = "hayat_recent_v1";
const MAX_ITEMS = 12;

function parseRecent(raw: string | null): RecentItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((i) => i && i.id && i.slug && i.name) : [];
  } catch {
    return [];
  }
}

function readRecent(): RecentItem[] {
  try {
    return parseRecent(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

/* Снапшот для useSyncExternalStore: кэшируем по сырой строке,
   чтобы возвращать стабильную ссылку между рендерами. */
const EMPTY: RecentItem[] = [];
let snapshotCache: { raw: string | null; items: RecentItem[] } = { raw: null, items: EMPTY };

function getSnapshot(): RecentItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (snapshotCache.raw !== raw) {
    snapshotCache = { raw, items: raw ? parseRecent(raw) : EMPTY };
  }
  return snapshotCache.items;
}

function getServerSnapshot(): RecentItem[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Трекер просмотра: положить на страницу товара — добавляет товар
 * в начало списка «Недавно смотрели» (localStorage, максимум 12).
 */
export function RecentlyViewedTracker({ item }: { item: RecentItem }) {
  useEffect(() => {
    try {
      const list = readRecent().filter((i) => i.id !== item.id);
      list.unshift({
        id: item.id,
        slug: item.slug,
        name: item.name,
        priceKopecks: item.priceKopecks,
        image: item.image ?? null,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
    } catch {
      /* ignore */
    }
  }, [item.id, item.slug, item.name, item.priceKopecks, item.image]);

  return null;
}

/**
 * Лента «Недавно смотрели»: горизонтальный скролл мини-карточек.
 * Рендерится только если в localStorage есть просмотренные товары.
 */
export function RecentlyViewed({
  excludeId,
  className,
}: {
  /** Не показывать текущий товар (на странице товара). */
  excludeId?: string;
  className?: string;
}) {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const items = useMemo(() => all.filter((i) => i.id !== excludeId), [all, excludeId]);

  if (items.length === 0) return null;

  return (
    <section className={className} aria-label="Недавно смотрели">
      <h2 className="mb-5 text-2xl font-extrabold tracking-tight sm:text-3xl">
        Недавно смотрели
      </h2>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/product/${item.slug}`}
            aria-label={`${item.name}, ${formatMoney(item.priceKopecks)}`}
            className="group w-36 shrink-0 overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md sm:w-44"
          >
            <SmartImage
              src={item.image}
              alt={item.name}
              ratio="1/1"
              rounded="rounded-none"
              sizes="176px"
              className="transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="p-3">
              <div className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-tight text-ink group-hover:text-brand-700">
                {item.name}
              </div>
              <div className="mt-1.5 font-extrabold">{formatMoney(item.priceKopecks)}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
