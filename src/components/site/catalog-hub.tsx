import Link from "next/link";
import { Tag, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/product/product-card";
import { AudienceCards } from "@/components/site/audience-cards";
import { CategoryTiles } from "@/components/site/category-tiles";
import { GOALS } from "@/lib/taxonomy";
import type { CategoryWithCount, ProductCardData, PurchasedProduct } from "@/lib/queries";

/**
 * Мобильный «хаб каталога» (как у Ozon/ВкусВилл): быстрая ориентация
 * по трём осям — «Зачем» (цели), «Кому» (аудитории) и категориям, плюс
 * лента хитов. Визуальный язык един с главной: фирменные чипсы-пилюли,
 * мини-плитки «Кому» и плитки категорий с обложкой SmartImage.
 * Рендерится только на «чистом» /catalog без фильтров; на десктопе скрыт.
 */
/** «N дн. назад» для плашки «Вы уже заказывали». */
function daysAgoLabel(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  return `${days} дн. назад`;
}

export function CatalogHub({
  categories,
  hits,
  purchased = [],
}: {
  categories: CategoryWithCount[];
  hits: ProductCardData[];
  /** Залогиненному — его прошлые покупки для быстрого повтора. */
  purchased?: PurchasedProduct[];
}) {
  return (
    <Container className="space-y-7 pb-8 pt-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Каталог</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Натуральные витамины и БАД ХАЯТ — по целям и для всей семьи
        </p>
      </header>

      {/* ── «Зачем»: лента чипсов-целей (фирменные пилюли, как на главной) ── */}
      <section aria-label="Подборки по целям">
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-1">
          <Link
            href="/sale"
            className="inline-flex min-h-10 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full bg-sale py-1.5 pl-1.5 pr-4 text-sm font-bold text-white shadow-xs transition active:opacity-90"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Tag className="h-4 w-4" aria-hidden />
            </span>
            Распродажа
          </Link>
          {GOALS.map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.slug}
                href={`/goal/${g.slug}`}
                className="group inline-flex min-h-10 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full bg-surface py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink shadow-xs ring-1 ring-line transition active:bg-brand-50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition group-active:bg-brand-500 group-active:text-white">
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                {g.name}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Персональное: быстрый повтор прошлых покупок ── */}
      {purchased.length > 0 ? (
        <section aria-label="Вы уже заказывали">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xl font-extrabold tracking-tight">Вы уже заказывали</h2>
            <Link href="/account/orders" className="text-sm font-semibold text-brand-700">
              Заказы <ArrowRight className="inline h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {purchased.map(({ product, lastOrderedAt }) => (
              <div key={product.id} className="w-40 shrink-0 snap-start">
                <div className="mb-1.5 inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                  {daysAgoLabel(lastOrderedAt)}
                </div>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── «Кому»: мини-плитки, как на главной ── */}
      <section aria-label="Кому">
        <h2 className="mb-3 text-lg font-extrabold tracking-tight">Кому</h2>
        <AudienceCards />
      </section>

      {/* ── Категории: плитки с обложкой SmartImage и счётчиком товаров ── */}
      <section aria-label="Категории">
        <h2 className="mb-3 text-lg font-extrabold tracking-tight">Категории</h2>
        <CategoryTiles categories={categories} />
      </section>

      {/* ── Хиты: горизонтальная лента ── */}
      {hits.length > 0 ? (
        <section aria-label="Хиты продаж">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold tracking-tight">Хиты продаж</h2>
            <Link
              href="/sale"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-bold text-brand-600 transition hover:text-brand-700"
            >
              Акции <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 py-1">
            {hits.map((p) => (
              <div key={p.id} className="w-40 shrink-0 snap-start sm:w-44">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
