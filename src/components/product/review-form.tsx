"use client";

import { useActionState, useState } from "react";
import { Star, CheckCircle2, Loader2 } from "lucide-react";
import { submitReview, type ReviewActionState } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: ReviewActionState = { ok: false };

const RATING_LABELS: Record<number, string> = {
  1: "Плохо",
  2: "Так себе",
  3: "Нормально",
  4: "Хорошо",
  5: "Отлично",
};

/** Форма «Оставить отзыв»: кликабельные звёзды, имя, текст. */
export function ReviewForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(submitReview, initialState);
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);

  if (state.ok) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-5 text-brand-800">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        <div>
          <div className="font-bold">Спасибо за отзыв!</div>
          <p className="mt-1 text-sm text-brand-700">
            Он появится на сайте после модерации.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <span className="mb-1.5 block text-sm font-semibold">Ваша оценка</span>
        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Оценка от 1 до 5 звёзд"
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const active = value <= (hovered || rating);
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} из 5`}
                onClick={() => setRating(value)}
                onMouseEnter={() => setHovered(value)}
                onMouseLeave={() => setHovered(0)}
                className="rounded-md p-0.5 transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={cn(
                    "h-7 w-7 transition-colors",
                    active ? "fill-accent-400 text-accent-400" : "text-line-strong",
                  )}
                />
              </button>
            );
          })}
          <span className="ml-2 text-sm font-medium text-ink-muted">
            {RATING_LABELS[hovered || rating]}
          </span>
        </div>
        {state.fieldErrors?.rating ? (
          <p className="mt-1 text-sm text-danger">{state.fieldErrors.rating}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="review-name" className="mb-1.5 block text-sm font-semibold">
          Ваше имя
        </label>
        <input
          id="review-name"
          name="authorName"
          required
          minLength={2}
          maxLength={80}
          placeholder="Как к вам обращаться?"
          className="h-11 w-full rounded-xl border border-line bg-surface px-4 text-[15px] placeholder:text-ink-faint focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {state.fieldErrors?.authorName ? (
          <p className="mt-1 text-sm text-danger">{state.fieldErrors.authorName}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="review-content" className="mb-1.5 block text-sm font-semibold">
          Отзыв <span className="font-normal text-ink-faint">(необязательно)</span>
        </label>
        <textarea
          id="review-content"
          name="content"
          rows={4}
          maxLength={2000}
          placeholder="Поделитесь впечатлением о товаре…"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] placeholder:text-ink-faint focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {state.fieldErrors?.content ? (
          <p className="mt-1 text-sm text-danger">{state.fieldErrors.content}</p>
        ) : null}
      </div>

      {state.error && !state.ok ? (
        <p className="text-sm font-medium text-danger">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Отправить отзыв
      </Button>
      <p className="text-xs text-ink-faint">
        Отзыв будет опубликован после проверки модератором.
      </p>
    </form>
  );
}
