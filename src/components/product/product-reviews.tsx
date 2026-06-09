import { Star, MessageSquarePlus } from "lucide-react";
import { ReviewForm } from "./review-form";
import { cn } from "@/lib/utils";

interface ReviewItem {
  id: string;
  authorName: string;
  rating: number;
  content: string | null;
  createdAt: Date;
}

/** Ряд из 5 звёзд (только отображение). */
export function RatingStars({
  rating,
  className,
  size = "h-4 w-4",
}: {
  rating: number;
  className?: string;
  size?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`Оценка ${rating} из 5`}
    >
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          aria-hidden
          className={cn(
            size,
            v <= Math.round(rating)
              ? "fill-accent-400 text-accent-400"
              : "fill-surface-sunken text-line-strong",
          )}
        />
      ))}
    </span>
  );
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Секция отзывов на странице товара: рейтинг, распределение, список, форма. */
export function ProductReviews({
  productId,
  reviews,
}: {
  productId: string;
  reviews: ReviewItem[];
}) {
  const count = reviews.length;
  const avg = count > 0 ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr] lg:gap-10">
      {/* сводка + форма */}
      <div className="space-y-6">
        {count > 0 ? (
          <div className="rounded-2xl bg-surface-soft p-5">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-extrabold leading-none">{avg.toLocaleString("ru-RU")}</span>
              <div className="pb-1">
                <RatingStars rating={avg} />
                <div className="mt-1 text-sm text-ink-muted">
                  {count} {pluralReviews(count)}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {distribution.map(({ star, n }) => (
                <div key={star} className="flex items-center gap-2 text-xs text-ink-muted">
                  <span className="w-3 text-right font-semibold">{star}</span>
                  <Star className="h-3 w-3 fill-accent-400 text-accent-400" aria-hidden />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full rounded-full bg-accent-400"
                      style={{ width: count ? `${(n / count) * 100}%` : 0 }}
                    />
                  </div>
                  <span className="w-6 tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
          <h3 className="mb-4 text-lg font-bold">Оставить отзыв</h3>
          <ReviewForm productId={productId} />
        </div>
      </div>

      {/* список отзывов */}
      <div>
        {count === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-2xl bg-surface-soft p-8 text-center">
            <MessageSquarePlus className="h-10 w-10 text-brand-300" aria-hidden />
            <p className="mt-3 font-bold">Отзывов пока нет</p>
            <p className="mt-1 max-w-xs text-sm text-ink-muted">
              Будьте первым — расскажите о своём опыте, это поможет другим покупателям.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-2xl bg-surface p-5 ring-1 ring-line">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">{review.authorName}</span>
                  <time
                    dateTime={review.createdAt.toISOString()}
                    className="text-xs text-ink-faint"
                  >
                    {dateFormatter.format(review.createdAt)}
                  </time>
                </div>
                <RatingStars rating={review.rating} className="mt-1.5" />
                {review.content ? (
                  <p className="mt-2.5 whitespace-pre-line leading-relaxed text-ink-muted">
                    {review.content}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function pluralReviews(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "отзыв";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "отзыва";
  return "отзывов";
}
