"use client";

import { useMemo, useState } from "react";
import {
  FlaskConical, Info, OctagonAlert, TriangleAlert, Sparkles, Search, X, Check,
} from "lucide-react";
import type { CompatibilityType } from "@prisma/client";
import { cn } from "@/lib/utils";

interface Rule {
  id: string;
  componentA: string;
  componentB: string;
  type: CompatibilityType;
  note: string | null;
}
interface Component {
  name: string;
  group: string;
}

const TYPE_META: Record<
  CompatibilityType,
  { title: string; short: string; icon: React.ComponentType<{ className?: string }>; tone: string; bar: string; badge: string; dot: string }
> = {
  SYNERGY: {
    title: "Усиливают друг друга", short: "Синергия", icon: Sparkles,
    tone: "text-brand-600", bar: "border-l-brand-500", badge: "bg-brand-50 text-brand-700", dot: "bg-brand-500",
  },
  CAUTION: {
    title: "С осторожностью", short: "Осторожно", icon: TriangleAlert,
    tone: "text-accent-600", bar: "border-l-accent-400", badge: "bg-accent-50 text-accent-700", dot: "bg-accent-400",
  },
  ANTAGONIST: {
    title: "Нельзя вместе", short: "Несовместимо", icon: OctagonAlert,
    tone: "text-sale", bar: "border-l-sale", badge: "bg-sale-soft text-sale", dot: "bg-sale",
  },
};
const GROUP_ORDER = ["Витамины", "Минералы", "Жиры и кислоты", "Аминокислоты", "Растения и прочее", "Другое"];

export function CompatibilityTool({
  rules, components, preselected,
}: {
  rules: Rule[];
  components: Component[];
  preselected: string[];
}) {
  const names = useMemo(() => new Set(components.map((c) => c.name)), [components]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselected.filter((p) => names.has(p))),
  );
  const [query, setQuery] = useState("");

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  // Группировка компонентов с фильтром поиска
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, Component[]>();
    for (const c of components) {
      if (q && !c.name.toLowerCase().includes(q)) continue;
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return [...map.entries()].sort(
      (a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]),
    );
  }, [components, query]);

  // Сработавшие правила для выбранных пар
  const matched = useMemo(
    () => rules.filter((r) => selected.has(r.componentA) && selected.has(r.componentB)),
    [rules, selected],
  );
  const counts = useMemo(() => {
    const c = { SYNERGY: 0, CAUTION: 0, ANTAGONIST: 0 } as Record<CompatibilityType, number>;
    for (const r of matched) c[r.type]++;
    return c;
  }, [matched]);

  const selectedList = [...selected];
  const hasConflict = counts.ANTAGONIST > 0;

  return (
    <div>
      <h1 className="mb-1 flex items-center gap-2.5 text-2xl font-extrabold sm:text-3xl">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
          <FlaskConical className="h-5 w-5 text-brand-600" />
        </span>
        Совместимость БАД
      </h1>
      <p className="mb-5 text-sm text-ink-muted">
        Отметьте, что принимаете, — покажем, что усиливает друг друга, а что лучше развести по времени.
      </p>

      {/* Сводка выбранного + быстрый сброс */}
      {selected.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-3 ring-1 ring-line">
          {selectedList.map((name) => (
            <button
              key={name}
              onClick={() => toggle(name)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 py-1.5 pl-3 pr-2 text-sm font-semibold text-white active:scale-95"
            >
              {name}
              <X className="h-3.5 w-3.5 opacity-80" />
            </button>
          ))}
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs font-semibold text-ink-faint hover:text-ink"
          >
            Сбросить
          </button>
        </div>
      ) : null}

      {/* Поиск + выбор компонентов по группам */}
      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти витамин или минерал…"
            className="h-11 w-full rounded-xl bg-surface-soft pl-10 pr-3 text-[15px] outline-none ring-1 ring-transparent focus:ring-brand-300"
          />
        </div>

        {grouped.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">Ничего не найдено.</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([group, items]) => (
              <div key={group}>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">{group}</div>
                <div className="flex flex-wrap gap-2">
                  {items.map((c) => {
                    const active = selected.has(c.name);
                    return (
                      <button
                        key={c.name}
                        onClick={() => toggle(c.name)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition active:scale-95",
                          active
                            ? "bg-brand-500 text-white shadow-sm"
                            : "bg-surface-soft text-ink-muted hover:bg-surface-sunken hover:text-ink",
                        )}
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : null}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Результаты */}
      <div className="mt-6">
        {selected.size < 2 ? (
          <Empty>Выберите минимум два компонента, чтобы увидеть их совместимость.</Empty>
        ) : (
          <>
            {/* Итоговый вердикт */}
            <div
              className={cn(
                "mb-5 flex items-center gap-3 rounded-2xl p-4 ring-1",
                hasConflict
                  ? "bg-sale-soft ring-sale/20"
                  : counts.CAUTION > 0
                    ? "bg-accent-50 ring-accent-200"
                    : matched.length > 0
                      ? "bg-brand-50 ring-brand-200"
                      : "bg-surface ring-line",
              )}
            >
              <span className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                hasConflict ? "bg-sale/10" : counts.CAUTION > 0 ? "bg-accent-100" : "bg-brand-100",
              )}>
                {hasConflict ? <OctagonAlert className="h-6 w-6 text-sale" />
                  : counts.CAUTION > 0 ? <TriangleAlert className="h-6 w-6 text-accent-600" />
                    : matched.length > 0 ? <Sparkles className="h-6 w-6 text-brand-600" />
                      : <Info className="h-6 w-6 text-ink-faint" />}
              </span>
              <div className="min-w-0">
                <div className="font-extrabold">
                  {hasConflict ? "Есть несовместимые пары"
                    : counts.CAUTION > 0 ? "Принимайте с осторожностью"
                      : matched.length > 0 ? "Отличное сочетание!"
                        : "Известных взаимодействий нет"}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-semibold">
                  {(["SYNERGY", "CAUTION", "ANTAGONIST"] as CompatibilityType[]).map((t) =>
                    counts[t] > 0 ? (
                      <span key={t} className={TYPE_META[t].tone}>
                        {TYPE_META[t].short}: {counts[t]}
                      </span>
                    ) : null,
                  )}
                  {matched.length === 0 ? (
                    <span className="text-ink-faint">Для этих компонентов правил не найдено</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Парная матрица (при 3..8 компонентах) — наглядная сетка */}
            {selected.size >= 3 && selected.size <= 8 ? (
              <Matrix components={selectedList} rules={rules} />
            ) : null}

            {/* Карточки правил по типам: сначала опасное */}
            <div className="space-y-6">
              {(["ANTAGONIST", "CAUTION", "SYNERGY"] as CompatibilityType[]).map((type) => {
                const items = matched.filter((r) => r.type === type);
                if (items.length === 0) return null;
                const meta = TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <section key={type}>
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
                      <Icon className={cn("h-5 w-5", meta.tone)} /> {meta.title}
                      <span className="text-sm font-semibold text-ink-faint">({items.length})</span>
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((r) => (
                        <div key={r.id} className={cn("rounded-2xl border-l-4 bg-surface p-4 ring-1 ring-line", meta.bar)}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">{r.componentA}</span>
                            <span className="text-ink-faint">+</span>
                            <span className="font-bold">{r.componentB}</span>
                            <span className={cn("ml-auto rounded-full px-2.5 py-1 text-xs font-bold", meta.badge)}>
                              {meta.short}
                            </span>
                          </div>
                          {r.note ? <p className="mt-2 text-sm text-ink-muted">{r.note}</p> : null}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex items-start gap-2.5 rounded-2xl bg-surface-soft p-4 text-sm text-ink-muted ring-1 ring-line">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
        <p>Справочная информация о всасывании нутриентов, не медицинская рекомендация. Проконсультируйтесь со специалистом.</p>
      </div>
    </div>
  );
}

/** Парная матрица совместимости выбранных компонентов: цветные точки. */
function Matrix({ components, rules }: { components: string[]; rules: Rule[] }) {
  const lookup = useMemo(() => {
    const m = new Map<string, CompatibilityType>();
    for (const r of rules) {
      m.set(`${r.componentA}|${r.componentB}`, r.type);
      m.set(`${r.componentB}|${r.componentA}`, r.type);
    }
    return m;
  }, [rules]);

  const short = (s: string) => (s.length > 6 ? s.slice(0, 5) + "…" : s);

  return (
    <div className="mb-6 overflow-x-auto no-scrollbar">
      <div className="inline-block rounded-2xl bg-surface p-3 ring-1 ring-line">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-16" />
              {components.map((c) => (
                <th key={c} className="px-1 pb-1 text-[10px] font-semibold text-ink-faint" title={c}>
                  {short(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {components.map((row) => (
              <tr key={row}>
                <td className="pr-1 text-right text-[10px] font-semibold text-ink-muted" title={row}>{short(row)}</td>
                {components.map((col) => {
                  if (row === col) {
                    return <td key={col}><span className="block h-7 w-7 rounded-md bg-surface-sunken" /></td>;
                  }
                  const type = lookup.get(`${row}|${col}`);
                  return (
                    <td key={col}>
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold",
                          type ? TYPE_META[type].badge : "bg-surface-soft text-ink-faint/40",
                        )}
                        title={type ? TYPE_META[type].title : "Нет данных"}
                      >
                        {type === "SYNERGY" ? "+" : type === "ANTAGONIST" ? "✕" : type === "CAUTION" ? "!" : "·"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface py-12 text-center ring-1 ring-line">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-soft">
        <FlaskConical className="h-7 w-7 text-ink-faint" />
      </span>
      <p className="mx-auto mt-3 max-w-sm px-4 text-ink-muted">{children}</p>
    </div>
  );
}
