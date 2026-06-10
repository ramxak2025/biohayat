"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  PillBottle, Check, Plus, Trash2, Power, Clock, X, CalendarDays,
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

/** Номер дня курса (1-based) для строки прогресса «День X из Y». */
function courseDay(startDateIso: string, today: string): number {
  const start = new Date(startDateIso.slice(0, 10) + "T00:00:00").getTime();
  const now = new Date(today + "T00:00:00").getTime();
  return Math.max(1, Math.floor((now - start) / 86_400_000) + 1);
}

/** Крупная чек-карточка слота времени: галочка анимированно «закрашивается». */
function SlotCard({
  planId, day, slot, taken,
}: {
  planId: string;
  day: string;
  slot: string;
  taken: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={taken}
      onClick={() => start(async () => { await toggleIntake(planId, day, slot); })}
      className={cn(
        "flex min-h-[64px] items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition disabled:opacity-60",
        taken
          ? "bg-brand-50 ring-brand-300"
          : "bg-surface ring-line hover:bg-surface-soft",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 transition-colors duration-300",
          taken ? "bg-brand-500 text-white ring-brand-500" : "bg-surface text-transparent ring-line-strong",
        )}
      >
        <Check
          className={cn(
            "h-5 w-5 transition-transform duration-300 ease-out",
            taken ? "scale-100" : "scale-0",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="tnum flex items-center gap-1.5 text-base font-extrabold">
          <Clock className="h-3.5 w-3.5 text-ink-faint" /> {slot}
        </span>
        <span className={cn("block text-xs font-medium", taken ? "text-brand-700" : "text-ink-muted")}>
          {taken ? "Принято" : "Отметить приём"}
        </span>
      </span>
    </button>
  );
}

/** Карточка курса: прогресс по дням, чек-карточки слотов, управление. */
function PlanCard({ plan, today }: { plan: PlanData; today: string }) {
  const [pendingAction, startAction] = useTransition();
  const takenCount = plan.times.filter((t) => plan.takenSlots.includes(t)).length;
  const total = plan.times.length;
  const allDone = total > 0 && takenCount === total;
  const day = courseDay(plan.startDate, today);
  const dayCapped = plan.durationDays ? Math.min(day, plan.durationDays) : day;

  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold">{plan.title}</h3>
            {allDone ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                <Check className="h-3 w-3" /> Готово
              </span>
            ) : null}
          </div>
          {plan.note ? <p className="mt-1 text-sm text-ink-muted">{plan.note}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Деактивировать курс"
            disabled={pendingAction}
            onClick={() => startAction(async () => { await setPlanActive(plan.id, false); })}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-soft hover:text-ink disabled:opacity-60"
          >
            <Power className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            title="Удалить курс"
            disabled={pendingAction}
            onClick={() => {
              if (confirm(`Удалить курс «${plan.title}»? Отметки приёма будут стёрты.`)) {
                startAction(async () => { await deleteIntakePlan(plan.id); });
              }
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-60"
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Прогресс курса по дням: «День X из Y» */}
      {plan.durationDays ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-ink-muted">
              <CalendarDays className="h-3.5 w-3.5" /> День {dayCapped} из {plan.durationDays}
            </span>
            <span className="tnum text-ink-faint">{Math.round((dayCapped / plan.durationDays) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-accent-400 transition-all"
              style={{ width: `${Math.min(100, (dayCapped / plan.durationDays) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Прогресс сегодняшнего дня по слотам */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: total ? `${(takenCount / total) * 100}%` : "0%" }}
          />
        </div>
        <span className="tnum shrink-0 text-xs font-bold text-ink-muted">
          {takenCount} / {total} сегодня
        </span>
      </div>

      {/* Чек-карточки слотов времени */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {plan.times.map((slot) => (
          <SlotCard
            key={slot}
            planId={plan.id}
            day={today}
            slot={slot}
            taken={plan.takenSlots.includes(slot)}
          />
        ))}
      </div>
    </div>
  );
}

/** Календарь-сетка истории приёма за последние 28 дней (4 недели × 7). */
function HistoryCalendar({ history }: { history: IntakeHistoryDay[] }) {
  const takenTotal = history.reduce((s, d) => s + d.taken, 0);
  const slotsTotal = history.reduce((s, d) => s + d.total, 0);
  if (slotsTotal === 0) return null;

  return (
    <div className="mb-6 rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          <CalendarDays className="h-5 w-5 text-brand-500" /> История за 28 дней
        </h2>
        <span className="tnum text-sm font-semibold text-ink-muted">
          {takenTotal} из {slotsTotal} приёмов
        </span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
        {history.map((d) => {
          const date = new Date(d.day + "T00:00:00");
          const full = d.total > 0 && d.taken >= d.total;
          const partial = !full && d.taken > 0;
          const label = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
          return (
            <div
              key={d.day}
              title={d.total > 0 ? `${label}: ${d.taken} из ${d.total}` : `${label}: курсов не было`}
              className={cn(
                "tnum flex aspect-square items-center justify-center rounded-lg text-xs font-bold transition sm:rounded-xl sm:text-sm",
                full && "bg-brand-500 text-white shadow-xs",
                partial && "bg-brand-200 text-brand-800", // полутон: отмечена часть слотов
                !full && !partial && (d.total > 0 ? "bg-surface-sunken text-ink-faint" : "bg-surface-soft text-ink-faint/60"),
              )}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint">
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-brand-500" /> все приёмы</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-brand-200" /> частично</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-surface-sunken" /> пропущено</span>
      </div>
    </div>
  );
}

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
    <form action={action} className="mt-4 space-y-4 rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
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
            "min-h-11 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition disabled:opacity-50",
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
            "min-h-11 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition disabled:opacity-50",
            mode === "catalog" ? "bg-brand-500 text-white ring-brand-500" : "ring-line-strong text-ink-muted hover:bg-surface-soft",
          )}
        >
          Из каталога
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={cn(
            "min-h-11 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition",
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
                  "min-h-11 rounded-2xl px-3.5 py-2 text-left text-sm font-semibold ring-1 transition",
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
                className="-m-1 flex h-7 w-7 items-center justify-center rounded-full text-brand-700/70 hover:text-brand-700"
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

  // Сводный прогресс дня по всем активным курсам.
  const totalSlots = plans.reduce((s, p) => s + p.times.length, 0);
  const takenSlots = plans.reduce(
    (s, p) => s + p.times.filter((t) => p.takenSlots.includes(t)).length,
    0,
  );

  const todayLabel = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(
    new Date(today + "T00:00:00"),
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Приём БАД</h1>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "primary"}>
          {showForm ? <><X className="h-4 w-4" /> Закрыть</> : <><Plus className="h-4 w-4" /> Добавить курс</>}
        </Button>
      </div>

      {/* Сводка по сегодняшнему дню */}
      {plans.length > 0 ? (
        <div className="mb-6 rounded-2xl bg-brand-500 p-5 text-white shadow-brand">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white/80">Сегодня, {todayLabel}</div>
              <div className="tnum mt-0.5 text-2xl font-extrabold">
                Принято {takenSlots} из {totalSlots}
              </div>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
              <PillBottle className="h-7 w-7 text-white" />
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: totalSlots ? `${(takenSlots / totalSlots) * 100}%` : "0%" }}
            />
          </div>
        </div>
      ) : null}

      {/* История приёма за последние 4 недели */}
      <HistoryCalendar history={history} />

      {showForm ? <AddPlanForm products={products} purchased={purchased} onCreated={() => setShowForm(false)} /> : null}

      {plans.length === 0 ? (
        !showForm ? (
          <div className="rounded-2xl bg-surface py-16 text-center ring-1 ring-line">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
              <PillBottle className="h-8 w-8 text-brand-500" />
            </span>
            <p className="mt-4 font-semibold text-ink">Активных курсов пока нет</p>
            <p className="mt-1 text-sm text-ink-muted">Добавьте курс — и отмечайте приёмы одним касанием.</p>
            <Button size="lg" className="mt-5" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Добавить курс
            </Button>
          </div>
        ) : null
      ) : (
        <div className="mt-6 space-y-4">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} today={today} />
          ))}
        </div>
      )}
    </div>
  );
}
