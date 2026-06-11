"use client";

import {
  useActionState, useCallback, useEffect, useMemo, useOptimistic, useState, useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  PillBottle, Check, Plus, Trash2, Power, Clock, X, CalendarDays,
  Flame, Sunrise, Sun, Moon, MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  createIntakePlan, toggleIntake, setPlanActive, deleteIntakePlan, type IntakeState,
} from "./actions";

export interface IntakeHistoryDay {
  day: string; // YYYY-MM-DD
  taken: number;
  total: number;
}

interface PlanData {
  id: string;
  title: string;
  times: string[];
  durationDays: number | null;
  note: string | null;
  startDate: string;
  takenSlots: string[];
}

interface ProductLite {
  id: string;
  name: string;
}

/** Один приём «сегодня»: курс + время + оптимистичный статус. */
interface TodaySlot {
  planId: string;
  planTitle: string;
  slot: string; // HH:MM
  taken: boolean;
}

/* ── Утилиты ─────────────────────────────────────────────────── */

/** Номер дня курса (1-based) для строки прогресса «День X из Y». */
function courseDay(startDateIso: string, today: string): number {
  const start = new Date(startDateIso.slice(0, 10) + "T00:00:00").getTime();
  const now = new Date(today + "T00:00:00").getTime();
  return Math.max(1, Math.floor((now - start) / 86_400_000) + 1);
}

/** Русское склонение: 1 день, 2 дня, 5 дней. */
function pluralDays(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "день";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "дня";
  return "дней";
}

/**
 * Стрик: сколько дней подряд (заканчивая сегодня или вчера) выполнены ВСЕ
 * приёмы. Незавершённый сегодняшний день серию не рвёт — просто не считается.
 */
function calcStreak(history: IntakeHistoryDay[]): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const d = history[i];
    const complete = d.total > 0 && d.taken >= d.total;
    if (i === history.length - 1 && !complete) continue; // сегодня ещё впереди
    if (complete) streak += 1;
    else break;
  }
  return streak;
}

/* ── Кольцо прогресса дня (как в нативных трекерах) ──────────── */

function ProgressRing({ taken, total }: { taken: number; total: number }) {
  const size = 116;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, taken / total) : 0;

  // Стартуем с 0 и «доезжаем» до фактического значения после маунта.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const offset = c * (1 - (ready ? pct : 0));
  const done = total > 0 && taken >= total;

  return (
    <div className="relative h-[116px] w-[116px] shrink-0" role="img" aria-label={`Принято ${taken} из ${total}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-brand-100)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? "var(--color-brand-500)" : "var(--color-brand-400)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{
            strokeDasharray: c,
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 0.7s var(--ease-out-soft), stroke 0.3s",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {done ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white shadow-brand">
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
        ) : (
          <span className="tnum text-[30px] font-extrabold leading-none text-ink">{taken}</span>
        )}
        <span className="mt-1 text-xs font-semibold text-ink-muted">из {total}</span>
      </div>
    </div>
  );
}

/* ── Лента недели: 7 последних дней со статусами ─────────────── */

function WeekStrip({ days }: { days: IntakeHistoryDay[] }) {
  const fmt = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 pt-1.5">
      {days.map((d, i) => {
        const date = new Date(d.day + "T00:00:00");
        const isToday = i === days.length - 1;
        const full = d.total > 0 && d.taken >= d.total;
        const partial = !full && d.taken > 0 && d.total > 0;
        const wd = fmt.format(date).replace(".", "");
        const label = wd.charAt(0).toUpperCase() + wd.slice(1);
        return (
          <div key={d.day} className="flex min-w-[42px] flex-1 flex-col items-center gap-1.5">
            <span className={cn("text-[11px] font-bold leading-none", isToday ? "text-brand-600" : "text-ink-faint")}>
              {label}
            </span>
            {full ? (
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white shadow-xs transition-all duration-300",
                  isToday && "ring-2 ring-brand-300 ring-offset-2 ring-offset-surface",
                )}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
            ) : partial ? (
              <span
                className={cn(
                  "h-9 w-9 rounded-full p-[3px] transition-all duration-300",
                  isToday && "ring-2 ring-brand-400 ring-offset-2 ring-offset-surface",
                )}
                style={{
                  background: `conic-gradient(var(--color-brand-400) ${Math.round((d.taken / d.total) * 100)}%, var(--color-brand-100) 0)`,
                }}
              >
                <span className="tnum flex h-full w-full items-center justify-center rounded-full bg-surface text-xs font-bold text-ink-muted">
                  {date.getDate()}
                </span>
              </span>
            ) : (
              <span
                className={cn(
                  "tnum flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                  d.total > 0 ? "text-ink-faint ring-1 ring-line-strong" : "bg-surface-soft text-ink-faint/50",
                  isToday && "ring-2 ring-brand-400 ring-offset-2 ring-offset-surface",
                )}
              >
                {date.getDate()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Карточка-чекбокс одного приёма «сегодня» ────────────────── */

function SlotCard({
  slot, index, onToggle,
}: {
  slot: TodaySlot;
  index: number;
  onToggle: (planId: string, slotTime: string, next: boolean) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [popping, setPopping] = useState(false);
  const { taken } = slot;

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={taken}
      onClick={() => {
        if (!taken) setPopping(true);
        start(() => onToggle(slot.planId, slot.slot, !taken));
      }}
      className={cn(
        "animate-fade-up flex min-h-[64px] w-full items-center gap-3 rounded-2xl p-3 text-left ring-1",
        "transition-all duration-300 active:scale-[0.98] disabled:opacity-70 sm:p-3.5",
        taken
          ? "bg-surface-soft/70 ring-line opacity-75"
          : "bg-surface shadow-xs ring-line hover:shadow-sm",
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <span
        className={cn(
          "tnum inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-sm font-extrabold transition-colors duration-300",
          taken ? "bg-brand-100/70 text-brand-700" : "bg-surface-soft text-ink",
        )}
      >
        <Clock className="h-3.5 w-3.5 opacity-60" /> {slot.slot}
      </span>

      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px] font-bold transition-colors duration-300", taken ? "text-ink-muted" : "text-ink")}>
          {slot.planTitle}
        </span>
        <span className={cn("block text-xs font-medium transition-colors duration-300", taken ? "text-brand-600" : "text-ink-faint")}>
          {taken ? "Принято" : "Нажмите, чтобы отметить"}
        </span>
      </span>

      {/* Большой круглый чек ≥44px с «прорисовкой» галочки */}
      <span
        onAnimationEnd={() => setPopping(false)}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300",
          taken
            ? "bg-brand-500 text-white shadow-brand"
            : "bg-surface text-transparent ring-2 ring-line-strong",
          popping && "intake-pop",
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: taken ? 0 : 1,
              transition: "stroke-dashoffset 0.35s var(--ease-out-soft) 0.05s",
            }}
          />
        </svg>
      </span>
    </button>
  );
}

/* ── Группы слотов по времени суток ──────────────────────────── */

const SLOT_GROUPS = [
  { id: "morning", label: "Утро", Icon: Sunrise, chip: "bg-accent-50 text-accent-600" },
  { id: "day", label: "День", Icon: Sun, chip: "bg-brand-50 text-brand-600" },
  { id: "evening", label: "Вечер", Icon: Moon, chip: "bg-info/10 text-info" },
] as const;

function groupOf(slot: string): (typeof SLOT_GROUPS)[number]["id"] {
  const hour = parseInt(slot.slice(0, 2), 10) || 0;
  if (hour < 12) return "morning";
  if (hour < 17) return "day";
  return "evening";
}

function TodaySlots({
  slots, onToggle,
}: {
  slots: TodaySlot[];
  onToggle: (planId: string, slotTime: string, next: boolean) => Promise<void>;
}) {
  return (
    <section className="space-y-5">
      {SLOT_GROUPS.map(({ id, label, Icon, chip }) => {
        const items = slots
          .filter((s) => groupOf(s.slot) === id)
          // Выполненные мягко опускаются в конец группы
          .sort((a, b) =>
            Number(a.taken) - Number(b.taken)
            || a.slot.localeCompare(b.slot)
            || a.planTitle.localeCompare(b.planTitle),
          );
        if (items.length === 0) return null;
        const done = items.filter((s) => s.taken).length;
        return (
          <div key={id}>
            <div className="mb-2 flex items-center justify-between px-0.5">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", chip)}>
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </h3>
              <span className="tnum text-xs font-bold text-ink-faint">{done} из {items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((s, i) => (
                <SlotCard key={`${s.planId}|${s.slot}`} slot={s} index={i} onToggle={onToggle} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ── Компактная карточка курса ───────────────────────────────── */

function PlanCard({ plan, today, index }: { plan: PlanData; today: string; index: number }) {
  const [pendingAction, startAction] = useTransition();
  const takenCount = plan.times.filter((t) => plan.takenSlots.includes(t)).length;
  const total = plan.times.length;
  const allDone = total > 0 && takenCount === total;
  const day = courseDay(plan.startDate, today);
  const dayCapped = plan.durationDays ? Math.min(day, plan.durationDays) : day;

  function closeMenu(e: React.MouseEvent<HTMLElement>) {
    const details = e.currentTarget.closest("details");
    if (details) details.open = false;
  }

  return (
    <div
      className="animate-fade-up rounded-2xl bg-surface p-4 ring-1 ring-line transition-shadow duration-300 hover:shadow-sm"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-extrabold">{plan.title}</h3>
            {allDone ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                <Check className="h-3 w-3" /> Готово
              </span>
            ) : null}
          </div>
          {plan.note ? <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{plan.note}</p> : null}
        </div>

        {/* Меню управления курсом — не загромождает карточку */}
        <details className="relative shrink-0">
          <summary
            aria-label={`Управление курсом «${plan.title}»`}
            className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full text-ink-muted transition-all duration-300 hover:bg-surface-soft active:scale-95 [&::-webkit-details-marker]:hidden"
          >
            <MoreVertical className="h-5 w-5" />
          </summary>
          <div className="animate-fade-up absolute right-0 top-12 z-20 w-52 rounded-xl bg-surface p-1.5 shadow-md ring-1 ring-line">
            <button
              type="button"
              disabled={pendingAction}
              onClick={(e) => {
                closeMenu(e);
                startAction(async () => { await setPlanActive(plan.id, false); });
              }}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold text-ink transition hover:bg-surface-soft disabled:opacity-60"
            >
              <Power className="h-4 w-4 text-ink-muted" /> Приостановить
            </button>
            <button
              type="button"
              disabled={pendingAction}
              onClick={(e) => {
                closeMenu(e);
                if (confirm(`Удалить курс «${plan.title}»? Отметки приёма будут стёрты.`)) {
                  startAction(async () => { await deleteIntakePlan(plan.id); });
                }
              }}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" /> Удалить курс
            </button>
          </div>
        </details>
      </div>

      {/* Прогресс курса «День X из Y» — тонкий бар */}
      {plan.durationDays ? (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-ink-muted">
              <CalendarDays className="h-3.5 w-3.5" /> День {dayCapped} из {plan.durationDays}
            </span>
            <span className="tnum text-ink-faint">{Math.round((dayCapped / plan.durationDays) * 100)}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-accent-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (dayCapped / plan.durationDays) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Времена приёма — статус-чипы (отмечаются в блоке «Сегодня») */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {plan.times.map((t) => {
          const taken = plan.takenSlots.includes(t);
          return (
            <span
              key={t}
              className={cn(
                "tnum inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-colors duration-300",
                taken ? "bg-brand-50 text-brand-700" : "bg-surface-soft text-ink-faint",
              )}
            >
              {taken ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />} {t}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── Календарь-сетка истории за 28 дней ──────────────────────── */

function HistoryCalendar({ history, today }: { history: IntakeHistoryDay[]; today: string }) {
  const takenTotal = history.reduce((s, d) => s + d.taken, 0);
  const slotsTotal = history.reduce((s, d) => s + d.total, 0);
  if (slotsTotal === 0) return null;

  return (
    <div className="animate-fade-up rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          <CalendarDays className="h-5 w-5 text-brand-500" /> История за 28 дней
        </h2>
        <span className="tnum text-sm font-semibold text-ink-muted">
          {takenTotal} из {slotsTotal} приёмов
        </span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {history.map((d, i) => {
          const date = new Date(d.day + "T00:00:00");
          const ratio = d.total > 0 ? d.taken / d.total : 0;
          const full = d.total > 0 && d.taken >= d.total;
          const partial = !full && d.taken > 0;
          const isToday = d.day === today;
          const label = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
          return (
            <div
              key={d.day}
              title={d.total > 0 ? `${label}: ${d.taken} из ${d.total}` : `${label}: курсов не было`}
              className={cn(
                "tnum relative mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 sm:text-sm",
                full && "bg-brand-500 text-white shadow-xs",
                partial && (ratio >= 0.5 ? "bg-brand-300 text-brand-900" : "bg-brand-200 text-brand-800"),
                !full && !partial && (d.total > 0 ? "text-ink-faint ring-1 ring-line" : "bg-surface-soft/70 text-ink-faint/50"),
                isToday && !full && "ring-2 ring-brand-400",
              )}
              style={{ animationDelay: `${i * 10}ms` }}
            >
              {date.getDate()}
              {full ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface shadow-xs">
                  <Check className="h-2.5 w-2.5 text-brand-600" strokeWidth={3.5} />
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-faint">
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-brand-500" /> все приёмы</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-brand-200" /> частично</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-full ring-1 ring-line" /> пропущено</span>
      </div>
    </div>
  );
}

/* ── Форма добавления курса ──────────────────────────────────── */

function SubmitAddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Добавление…" : "Добавить курс"}
    </Button>
  );
}

/** Форма добавления курса (раскрывается по кнопке). */
function AddPlanForm({
  products, purchased, onCreated,
}: {
  products: ProductLite[];
  purchased: ProductLite[];
  onCreated: () => void;
}) {
  const [state, action] = useActionState<IntakeState, FormData>(createIntakePlan, {});
  const [mode, setMode] = useState<"purchased" | "catalog" | "custom">(
    purchased.length ? "purchased" : products.length ? "catalog" : "custom",
  );
  const [purchasedId, setPurchasedId] = useState<string>(purchased[0]?.id ?? "");
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    if (state.ok) {
      toast.success("Курс добавлен");
      onCreated();
    }
    if (state.error) toast.error(state.error);
  }, [state, onCreated]);

  function addTime() {
    const t = newTime.trim();
    if (!t) return;
    if (!times.includes(t)) setTimes((prev) => [...prev, t].sort());
    setNewTime("");
  }

  return (
    <form action={action} className="animate-fade-up mb-6 space-y-4 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line sm:p-5">
      <h2 className="font-bold">Новый курс</h2>
      {/* Скрытые поля времён — отправляются как множественное times */}
      {times.map((t) => (
        <input key={t} type="hidden" name="times" value={t} />
      ))}

      {/* Переключатель: из покупок, из каталога или своё название */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("purchased")}
          disabled={!purchased.length}
          className={cn(
            "min-h-11 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-all duration-300 active:scale-[0.97] disabled:opacity-50",
            mode === "purchased" ? "bg-brand-500 text-white ring-brand-500" : "ring-line-strong text-ink-muted hover:bg-surface-soft",
          )}
        >
          Мои покупки
        </button>
        <button
          type="button"
          onClick={() => setMode("catalog")}
          disabled={!products.length}
          className={cn(
            "min-h-11 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-all duration-300 active:scale-[0.97] disabled:opacity-50",
            mode === "catalog" ? "bg-brand-500 text-white ring-brand-500" : "ring-line-strong text-ink-muted hover:bg-surface-soft",
          )}
        >
          Из каталога
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={cn(
            "min-h-11 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-all duration-300 active:scale-[0.97]",
            mode === "custom" ? "bg-brand-500 text-white ring-brand-500" : "ring-line-strong text-ink-muted hover:bg-surface-soft",
          )}
        >
          Своё название
        </button>
      </div>

      {mode === "purchased" ? (
        <div>
          <Label required>Из ваших заказов</Label>
          <input type="hidden" name="productId" value={purchasedId} />
          <div className="flex flex-wrap gap-2">
            {purchased.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPurchasedId(p.id)}
                className={cn(
                  "min-h-11 rounded-2xl px-3.5 py-2 text-left text-sm font-semibold ring-1 transition-all duration-300 active:scale-[0.97]",
                  purchasedId === p.id
                    ? "bg-brand-50 text-brand-700 ring-brand-400"
                    : "bg-surface text-ink-muted ring-line hover:bg-surface-soft",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ) : mode === "catalog" ? (
        <div>
          <Label htmlFor="productId" required>Товар</Label>
          <Select id="productId" name="productId" defaultValue="">
            <option value="" disabled>Выберите товар</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
      ) : (
        <div>
          <Label htmlFor="title" required>Название курса</Label>
          <Input id="title" name="title" placeholder="Например, Витамин D3" />
        </div>
      )}

      {/* Времена приёма */}
      <div>
        <Label>Времена приёма</Label>
        <div className="flex flex-wrap gap-2">
          {times.map((t) => (
            <span
              key={t}
              className="tnum inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700"
            >
              <Clock className="h-3.5 w-3.5" /> {t}
              <button
                type="button"
                onClick={() => setTimes((prev) => prev.filter((x) => x !== t))}
                className="-m-1 flex h-7 w-7 items-center justify-center rounded-full text-brand-700/70 transition hover:text-brand-700"
                aria-label={`Удалить ${t}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="max-w-[160px]"
          />
          <Button type="button" variant="outline" onClick={addTime}>
            <Plus className="h-4 w-4" /> Добавить время
          </Button>
        </div>
        {times.length === 0 ? (
          <p className="mt-1 text-sm text-danger">Добавьте хотя бы одно время приёма.</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="durationDays">Длительность курса, дней</Label>
          <Input id="durationDays" name="durationDays" type="number" min={1} placeholder="напр. 30" />
        </div>
      </div>

      <div>
        <Label htmlFor="note">Заметка</Label>
        <Textarea id="note" name="note" placeholder="Например: принимать во время еды" />
      </div>

      <SubmitAddButton />
    </form>
  );
}

/* ── Пустое состояние ────────────────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="animate-fade-up rounded-2xl bg-surface px-6 py-14 text-center ring-1 ring-line">
      <div className="relative mx-auto h-[132px] w-[132px]">
        <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
          <circle cx="66" cy="66" r="58" fill="none" stroke="var(--color-brand-100)" strokeWidth="11" strokeLinecap="round" strokeDasharray="2 14" />
          <circle cx="66" cy="66" r="58" fill="none" stroke="var(--color-brand-300)" strokeWidth="11" strokeLinecap="round" strokeDasharray="64 301" />
        </svg>
        <span className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
          <PillBottle className="h-8 w-8 text-brand-500" />
        </span>
      </div>
      <h2 className="mt-6 text-xl font-extrabold">Начните заботиться о себе</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
        Добавьте витамины или БАД, которые принимаете, — и отмечайте приёмы одним
        касанием. Кольцо прогресса и серия дней помогут не сбиться с курса.
      </p>
      <Button size="lg" className="mt-6 active:scale-[0.97]" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Добавить первый курс
      </Button>
    </div>
  );
}

/* ── Главный экран раздела ───────────────────────────────────── */

export function IntakeView({
  today, plans, products, purchased, history,
}: {
  today: string;
  plans: PlanData[];
  products: ProductLite[];
  /** Купленные пользователем товары — приоритетный выбор для нового курса. */
  purchased: ProductLite[];
  history: IntakeHistoryDay[];
}) {
  const [showForm, setShowForm] = useState(false);

  // ── Оптимистичный статус слотов: ключ `${planId}|${slot}` → принят ли ──
  const baseTaken = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const p of plans) {
      for (const t of p.times) map.set(`${p.id}|${t}`, p.takenSlots.includes(t));
    }
    return map;
  }, [plans]);

  const [optimisticTaken, applyOptimistic] = useOptimistic(
    baseTaken,
    (state: Map<string, boolean>, action: { key: string; value: boolean }) =>
      new Map(state).set(action.key, action.value),
  );

  const toggleSlot = useCallback(
    async (planId: string, slotTime: string, next: boolean) => {
      applyOptimistic({ key: `${planId}|${slotTime}`, value: next });
      try {
        await toggleIntake(planId, today, slotTime);
      } catch {
        toast.error("Не удалось сохранить отметку. Попробуйте ещё раз.");
      }
    },
    [applyOptimistic, today],
  );

  // ── Производные данные с учётом оптимистичных отметок ──
  const effectivePlans = useMemo(
    () => plans.map((p) => ({
      ...p,
      takenSlots: p.times.filter((t) => optimisticTaken.get(`${p.id}|${t}`)),
    })),
    [plans, optimisticTaken],
  );

  const totalSlots = effectivePlans.reduce((s, p) => s + p.times.length, 0);
  const takenSlots = effectivePlans.reduce((s, p) => s + p.takenSlots.length, 0);

  // Сегодняшний день в истории — живой (оптимистичный), остальное с сервера.
  const effectiveHistory = useMemo(
    () => history.map((d) =>
      d.day === today ? { day: d.day, taken: takenSlots, total: totalSlots } : d,
    ),
    [history, today, takenSlots, totalSlots],
  );

  const streak = calcStreak(effectiveHistory);
  const weekDays = effectiveHistory.slice(-7);

  const todaySlots: TodaySlot[] = effectivePlans.flatMap((p) =>
    p.times.map((t) => ({
      planId: p.id,
      planTitle: p.title,
      slot: t,
      taken: p.takenSlots.includes(t),
    })),
  );

  const todayLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(
    new Date(today + "T00:00:00"),
  );

  const subtitle =
    totalSlots > 0 && takenSlots >= totalSlots
      ? "Идеальный день — всё принято!"
      : takenSlots > 0
        ? "Отличный темп!"
        : "Время позаботиться о себе";

  return (
    <div>
      {/* Локальные keyframes микро-интеракций (с учётом reduced-motion) */}
      <style>{`
        @keyframes intake-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.18); }
          70% { transform: scale(0.94); }
          100% { transform: scale(1); }
        }
        .intake-pop { animation: intake-pop 0.45s var(--ease-out-soft); }
        @media (prefers-reduced-motion: reduce) {
          .intake-pop { animation: none; }
        }
      `}</style>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Приём БАД</h1>
        <Button
          onClick={() => setShowForm((v) => !v)}
          variant={showForm ? "outline" : "primary"}
          className="active:scale-[0.97]"
        >
          {showForm ? <><X className="h-4 w-4" /> Закрыть</> : <><Plus className="h-4 w-4" /> Добавить курс</>}
        </Button>
      </div>

      {/* ── Хедер дня: кольцо прогресса, мотивация, стрик, неделя ── */}
      {plans.length > 0 ? (
        <section className="animate-fade-up mb-6 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line sm:p-5">
          <div className="flex items-center gap-4 sm:gap-6">
            <ProgressRing taken={takenSlots} total={totalSlots} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                Сегодня, {todayLabel}
              </div>
              <div className="mt-1 text-lg font-extrabold leading-snug text-ink sm:text-xl">
                {subtitle}
              </div>
              <div className="mt-2.5">
                {streak > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1.5 text-sm font-bold text-accent-700">
                    <Flame className="h-4 w-4 text-accent-500" />
                    <span className="tnum">{streak}</span> {pluralDays(streak)} подряд
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted">
                    <Flame className="h-4 w-4 text-ink-faint" />
                    Отметьте все приёмы — начнётся серия
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Лента последних 7 дней */}
          <div className="mt-4 border-t border-line pt-3">
            <WeekStrip days={weekDays} />
          </div>
        </section>
      ) : null}

      {showForm ? (
        <AddPlanForm products={products} purchased={purchased} onCreated={() => setShowForm(false)} />
      ) : null}

      {plans.length === 0 ? (
        !showForm ? <EmptyState onAdd={() => setShowForm(true)} /> : null
      ) : (
        <div className="space-y-6">
          {/* Сегодняшние приёмы по времени суток */}
          <TodaySlots slots={todaySlots} onToggle={toggleSlot} />

          {/* Курсы */}
          <section>
            <h2 className="mb-2 flex items-center gap-2 px-0.5 text-sm font-extrabold text-ink">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <PillBottle className="h-4 w-4" />
              </span>
              Мои курсы
            </h2>
            <div className="space-y-3">
              {effectivePlans.map((p, i) => (
                <PlanCard key={p.id} plan={p} today={today} index={i} />
              ))}
            </div>
          </section>

          {/* История приёма за последние 4 недели */}
          <HistoryCalendar history={effectiveHistory} today={today} />
        </div>
      )}
    </div>
  );
}
