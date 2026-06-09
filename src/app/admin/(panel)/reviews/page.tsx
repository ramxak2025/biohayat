import Link from "next/link";
import { Star } from "lucide-react";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form-controls";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { deleteReview } from "./actions";
import { ReviewModerationButtons } from "./review-controls";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "pending", label: "На модерации" },
  { value: "approved", label: "Одобренные" },
  { value: "all", label: "Все" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

/** Звёздочки рейтинга 1..5. */
function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Оценка: ${value} из 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("h-4 w-4", n <= value ? "fill-accent-500 text-accent-500" : "text-line-strong")}
        />
      ))}
    </span>
  );
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter: Filter = rawFilter === "approved" || rawFilter === "all" ? rawFilter : "pending";

  const where =
    filter === "pending" ? { isApproved: false } : filter === "approved" ? { isApproved: true } : {};

  const [reviews, pendingCount] = await Promise.all([
    prisma.productReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { product: { select: { name: true, slug: true } } },
    }),
    prisma.productReview.count({ where: { isApproved: false } }),
  ]);

  return (
    <>
      <AdminHeader
        title="Отзывы"
        description={`На модерации: ${pendingCount}`}
      />

      {/* Фильтр по статусу модерации */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "pending" ? "/admin/reviews" : `/admin/reviews?filter=${f.value}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition",
              filter === f.value
                ? "bg-brand-500 text-white"
                : "bg-surface text-ink-muted ring-1 ring-line hover:text-ink",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {reviews.length === 0 ? (
        <EmptyState>
          {filter === "pending" ? "Отзывов на модерации нет." : "Отзывы не найдены."}
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="p-4 font-semibold">Товар</th>
                <th className="p-4 font-semibold">Автор</th>
                <th className="p-4 font-semibold">Рейтинг</th>
                <th className="p-4 font-semibold">Текст</th>
                <th className="p-4 font-semibold">Дата</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {reviews.map((r) => (
                <tr key={r.id} className="hover:bg-surface-soft/50">
                  <td className="max-w-[200px] p-4">
                    <Link
                      href={`/product/${r.product.slug}`}
                      target="_blank"
                      className="line-clamp-2 font-semibold text-brand-700 hover:underline"
                    >
                      {r.product.name}
                    </Link>
                  </td>
                  <td className="p-4 font-semibold">{r.authorName}</td>
                  <td className="p-4"><Rating value={r.rating} /></td>
                  <td className="max-w-[320px] p-4 text-ink-muted">
                    <span className="line-clamp-3 whitespace-pre-line">{r.content || "—"}</span>
                  </td>
                  <td className="p-4 text-ink-muted">
                    {new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(r.createdAt)}
                  </td>
                  <td className="p-4">
                    <Pill tone={r.isApproved ? "green" : "amber"}>
                      {r.isApproved ? "Одобрен" : "На модерации"}
                    </Pill>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <ReviewModerationButtons id={r.id} isApproved={r.isApproved} />
                      <DeleteButton
                        action={deleteReview.bind(null, r.id)}
                        label=""
                        confirmText={`Удалить отзыв от «${r.authorName}»?`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
