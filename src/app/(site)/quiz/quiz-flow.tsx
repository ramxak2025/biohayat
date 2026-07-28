"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, type LucideIcon } from "lucide-react";
import { AUDIENCES, GOALS } from "@/lib/taxonomy";

/**
 * Клиентский квиз «Подбор за 1 минуту»: 3 шага (кому / цель / возраст),
 * прогресс-точки, кнопка «Назад», fade-up при смене шага (key={step}).
 * Результат — переход на серверную страницу /quiz/result.
 */

const STEPS = ["Для кого?", "Главная цель?", "Возраст?"] as const;

/** Подписи-подсказки к аудиториям (сами оси — из taxonomy). */
const AUDIENCE_HINTS: Record<string, string> = {
  men: "Сила, энергия, тонус",
  women: "Красота, баланс, лёгкость",
  kids: "Рост, иммунитет, развитие",
};

/**
 * Возраст влияет на подбор мягко: добавляет «дополнительную» цель
 * (extra) к выбранной — 60+ приоритизирует суставы/сердце, до 25 — энергию.
 */
const AGE_OPTIONS: { value: string; label: string; boost: string[] }[] = [
  { value: "u25", label: "до 25", boost: ["energy"] },
  { value: "25-40", label: "25–40", boost: [] },
  { value: "40-60", label: "40–60", boost: [] },
  { value: "60+", label: "60+", boost: ["joints", "heart"] },
];

export function QuizFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [audience, setAudience] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function finish(ageValue: string) {
    if (!audience || !goal || submitting) return;
    setSubmitting(true);
    const boost = AGE_OPTIONS.find((a) => a.value === ageValue)?.boost ?? [];
    const extra = boost.find((g) => g !== goal);
    const params = new URLSearchParams({ audience, goal });
    if (extra) params.set("extra", extra);
    router.push(`/quiz/result?${params.toString()}`);
  }

  return (
    <div className="mt-6 sm:mt-8">
      {/* прогресс-точки */}
      <div className="flex items-center justify-center gap-2" aria-label={`Шаг ${step + 1} из 3`}>
        {STEPS.map((title, i) => (
          <span
            key={title}
            aria-hidden
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? "w-6 bg-brand-500" : i < step ? "w-2 bg-brand-300" : "w-2 bg-line-strong"
            }`}
          />
        ))}
      </div>

      {/* шаг: key перезапускает fade-up при каждой смене */}
      <div key={step} className="animate-fade-up mt-6">
        <h2 className="text-center text-lg font-extrabold tracking-tight sm:text-xl">
          {STEPS[step]}
        </h2>

        {step === 0 ? (
          <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-4">
            {AUDIENCES.map((a) => (
              <OptionCard
                key={a.slug}
                icon={a.icon}
                title={a.name}
                hint={AUDIENCE_HINTS[a.slug]}
                selected={audience === a.slug}
                onClick={() => {
                  setAudience(a.slug);
                  setStep(1);
                }}
              />
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
            {GOALS.map((g) => (
              <OptionCard
                key={g.slug}
                icon={g.icon}
                title={g.name}
                selected={goal === g.slug}
                onClick={() => {
                  setGoal(g.slug);
                  setStep(2);
                }}
              />
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <>
            <p className="mt-1 text-center text-sm text-ink-muted">
              Учтём возрастные приоритеты — это влияет на подбор мягко
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
              {AGE_OPTIONS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => finish(a.value)}
                  className="flex min-h-[64px] items-center justify-center rounded-2xl bg-surface px-3 py-4 text-base font-bold text-ink shadow-xs ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-300 active:bg-brand-50 disabled:opacity-60"
                >
                  {a.label}
                </button>
              ))}
            </div>
            {submitting ? (
              <p className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Собираем подборку…
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {/* назад */}
      {step > 0 && !submitting ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full px-4 text-sm font-semibold text-ink-muted transition hover:bg-surface-soft hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden /> Назад
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Карточка-вариант: иконка в кружке + название (+ подсказка). Тач ≥44px. */
function OptionCard({
  icon: Icon,
  title,
  hint,
  selected,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group flex min-h-[44px] flex-col items-center gap-1.5 rounded-2xl bg-surface px-2 py-4 text-center shadow-xs ring-1 transition hover:-translate-y-0.5 hover:shadow-md active:bg-brand-50 sm:py-5 ${
        selected ? "ring-2 ring-brand-500" : "ring-line hover:ring-brand-300"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition sm:h-12 sm:w-12 sm:rounded-2xl ${
          selected
            ? "bg-brand-500 text-white"
            : "bg-brand-50 text-brand-600 group-hover:bg-brand-500 group-hover:text-white"
        }`}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.9} aria-hidden />
      </span>
      <span className="text-sm font-bold leading-tight text-ink">{title}</span>
      {hint ? (
        <span className="line-clamp-1 max-w-full text-xs leading-tight text-ink-muted">
          {hint}
        </span>
      ) : null}
    </button>
  );
}
