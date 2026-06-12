"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, PackageSearch, Search, X } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { useB2BCart } from "@/components/opt/b2b-cart-provider";
import {
  pluralPositions,
  unitPriceForQty,
  type PriceItem,
} from "@/components/opt/price-math";
import { PriceRow } from "@/components/opt/price-row";
import { PriceCard } from "@/components/opt/price-card";

/**
 * Прайс-лист — главный экран опта. Психология B2B: плотная таблица,
 * мгновенный расчёт, экономия против розницы всегда на виду (sticky-итог).
 */
export function PriceView({
  company,
  dateLabel,
  items,
}: {
  company: string;
  /** Дата прайса, отформатированная на сервере (во избежание hydration-рассинхрона). */
  dateLabel: string;
  items: PriceItem[];
}) {
  const cart = useB2BCart();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) map.set(it.categoryId, it.categoryName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) =>
        (!categoryId || it.categoryId === categoryId) &&
        (!q || it.name.toLowerCase().includes(q)),
    );
  }, [items, query, categoryId]);

  const qtyOf = useMemo(() => {
    const map = new Map(cart.items.map((i) => [i.productId, i.qty]));
    return (id: string) => map.get(id) ?? 0;
  }, [cart.items]);

  /** Кол-во колонок лесенки в таблице — максимум по всем товарам. */
  const tierCols = useMemo(
    () => Math.max(1, ...items.map((it) => it.tiers.length)),
    [items],
  );

  // Итог по корзине (по всем товарам, не только отфильтрованным)
  const totals = useMemo(() => {
    const byId = new Map(items.map((it) => [it.id, it]));
    let positions = 0;
    let units = 0;
    let total = 0;
    let retailTotal = 0;
    for (const ci of cart.items) {
      const it = byId.get(ci.productId);
      if (!it) continue;
      positions += 1;
      units += ci.qty;
      total += unitPriceForQty(it.retailKopecks, it.tiers, ci.qty) * ci.qty;
      retailTotal += it.retailKopecks * ci.qty;
    }
    const saving = retailTotal - total;
    const savingPct = retailTotal > 0 ? Math.round((saving / retailTotal) * 100) : 0;
    return { positions, units, total, saving, savingPct };
  }, [cart.items, items]);

  return (
    <div className={cn(totals.positions > 0 && "pb-36 sm:pb-28")}>
      {/* Шапка прайса */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Прайс-лист</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {company} · актуален на {dateLabel}
          </p>
        </div>
        <Link
          href="/opt/orders"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-5 text-sm font-semibold transition-colors hover:bg-surface-soft"
        >
          <ClipboardList className="h-4 w-4" /> Мои заявки
        </Link>
      </div>

      {/* Поиск + чипсы категорий */}
      <div className="mt-5 space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти товар по названию…"
            className="h-11 w-full rounded-full bg-surface pl-10 pr-10 text-sm ring-1 ring-line outline-none transition placeholder:text-ink-faint focus:ring-2 focus:ring-brand-400"
          />
          {query ? (
            <button
              type="button"
              aria-label="Очистить поиск"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-surface-soft"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {categories.length > 1 ? (
          <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            <CategoryChip active={!categoryId} onClick={() => setCategoryId(null)}>
              Все
            </CategoryChip>
            {categories.map((c) => (
              <CategoryChip
                key={c.id}
                active={categoryId === c.id}
                onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
              >
                {c.name}
              </CategoryChip>
            ))}
          </div>
        ) : null}
      </div>

      {/* Список */}
      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-surface py-16 text-center ring-1 ring-line">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-soft">
            <PackageSearch className="h-8 w-8 text-ink-faint" />
          </span>
          <p className="mt-4 font-semibold">Ничего не найдено</p>
          <p className="mt-1 text-sm text-ink-muted">
            Попробуйте изменить запрос или сбросить фильтр категории.
          </p>
        </div>
      ) : (
        <>
          {/* ДЕСКТОП: плотная таблица */}
          <div className="mt-6 hidden overflow-hidden rounded-2xl bg-surface ring-1 ring-line lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface-soft/60 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                  <th className="py-2.5 pl-4 pr-3 font-bold">Товар</th>
                  <th className="px-3 py-2.5 font-bold">Розница</th>
                  <th className="px-3 py-2.5 text-center font-bold" colSpan={tierCols}>
                    Оптовая цена за шт
                  </th>
                  <th className="px-3 py-2.5 font-bold">Кол-во</th>
                  <th className="px-3 py-2.5 text-right font-bold">Сумма</th>
                  <th className="py-2.5 pl-1 pr-4" aria-label="Действие" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <PriceRow
                    key={it.id}
                    item={it}
                    qty={qtyOf(it.id)}
                    tierCols={tierCols}
                    onQty={(q) => cart.setQty(it.id, q)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* МОБАЙЛ: карточки */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:hidden">
            {filtered.map((it) => (
              <PriceCard
                key={it.id}
                item={it}
                qty={qtyOf(it.id)}
                onQty={(q) => cart.setQty(it.id, q)}
              />
            ))}
          </div>
        </>
      )}

      {/* STICKY-ИТОГ: экономия всегда на виду */}
      {cart.ready && totals.positions > 0 ? (
        <div className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <div className="tnum text-sm font-bold">
                {pluralPositions(totals.positions)} · {totals.units} шт ·{" "}
                {formatMoney(totals.total)}
              </div>
              {totals.saving > 0 ? (
                <div className="tnum text-xs font-semibold text-brand-700">
                  Ваша экономия против розницы: {formatMoney(totals.saving)} (−
                  {totals.savingPct}%)
                </div>
              ) : null}
            </div>
            <Link
              href="/opt/request"
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-brand-500 px-7 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 active:bg-brand-700 max-sm:w-full"
            >
              Отправить заявку
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 shrink-0 snap-start items-center rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition",
        active
          ? "bg-brand-500 text-white ring-brand-500 shadow-sm"
          : "bg-surface text-ink-muted ring-line hover:bg-surface-soft",
      )}
    >
      {children}
    </button>
  );
}
