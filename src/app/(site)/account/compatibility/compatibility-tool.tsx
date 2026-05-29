"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Info } from "lucide-react";
import type { CompatibilityType } from "@prisma/client";
import { cn } from "@/lib/utils";

// Правило, переданное с сервера (только нужные поля)
interface Rule {
  id: string;
  componentA: string;
  componentB: string;
  type: CompatibilityType;
  note: string | null;
}

// Оформление групп по типу совместимости
const GROUPS: { type: CompatibilityType; emoji: string; title: string; ring: string; badge: string }[] = [
  { type: "ANTAGONIST", emoji: "🔴", title: "Нельзя вместе", ring: "ring-danger/30 bg-danger/5", badge: "bg-danger/10 text-danger" },
  { type: "CAUTION", emoji: "🟡", title: "С осторожностью", ring: "ring-accent-400/30 bg-accent-50", badge: "bg-accent-50 text-accent-600" },
  { type: "SYNERGY", emoji: "🟢", title: "Синергия", ring: "ring-brand-400/30 bg-brand-50", badge: "bg-brand-50 text-brand-700" },
];

export function CompatibilityTool({
  rules,
  components,
  preselected,
}: {
  rules: Rule[];
  components: string[];
  preselected: string[];
}) {
  // Выбранные компоненты (изначально — из активных курсов клиента)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselected.filter((p) => components.includes(p))),
  );

  function toggle(component: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(component)) next.delete(component);
      else next.add(component);
      return next;
    });
  }

  // Чистая клиентская фильтрация: правило показываем, если оба компонента выбраны
  const matched = useMemo(
    () => rules.filter((r) => selected.has(r.componentA) && selected.has(r.componentB)),
    [rules, selected],
  );

  return (
    <div>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-extrabold">
        <FlaskConical className="h-6 w-6 text-brand-500" /> Совместимость БАД
      </h1>
      <p className="mb-6 text-sm text-ink-muted">
        Отметьте компоненты, которые вы принимаете, — мы покажем, как они сочетаются друг с другом.
        Компоненты из ваших активных курсов уже отмечены.
      </p>

      {/* Выбор компонентов */}
      <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
        <div className="mb-3 text-sm font-semibold text-ink">Что вы принимаете?</div>
        {components.length === 0 ? (
          <p className="text-sm text-ink-muted">Список компонентов пуст.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {components.map((c) => {
              const active = selected.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                    active
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-surface-soft text-ink-muted hover:bg-surface-sunken hover:text-ink",
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Результаты */}
      <div className="mt-6 space-y-6">
        {selected.size < 2 ? (
          <div className="rounded-2xl bg-surface-soft py-12 text-center text-ink-muted ring-1 ring-line">
            Выберите минимум два компонента, чтобы увидеть их совместимость.
          </div>
        ) : matched.length === 0 ? (
          <div className="rounded-2xl bg-surface-soft py-12 text-center text-ink-muted ring-1 ring-line">
            Для выбранных компонентов известных правил совместимости не найдено.
          </div>
        ) : (
          GROUPS.map((g) => {
            const items = matched.filter((r) => r.type === g.type);
            if (items.length === 0) return null;
            return (
              <section key={g.type}>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
                  <span>{g.emoji}</span> {g.title}
                  <span className="text-sm font-semibold text-ink-faint">({items.length})</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((r) => (
                    <div key={r.id} className={cn("rounded-2xl p-4 ring-1", g.ring)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{r.componentA}</span>
                        <span className="text-ink-faint">+</span>
                        <span className="font-bold">{r.componentB}</span>
                        <span className={cn("ml-auto rounded-full px-2.5 py-1 text-xs font-bold", g.badge)}>
                          {g.title}
                        </span>
                      </div>
                      {r.note ? (
                        <p className="mt-2 text-sm text-ink-muted">{r.note}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Дисклеймер */}
      <div className="mt-8 flex items-start gap-2.5 rounded-2xl bg-surface-soft p-4 text-sm text-ink-muted ring-1 ring-line">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
        <p>
          Информация носит справочный характер и не является медицинской рекомендацией.
          Проконсультируйтесь со специалистом.
        </p>
      </div>
    </div>
  );
}
