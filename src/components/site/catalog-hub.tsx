import Link from "next/link";
import {
  Pill, ShieldPlus, Flame, Mars, Venus, Baby, Dumbbell, BrainCircuit,
  Soup, Droplets, Bone, Activity, Sparkles, Droplet, Hexagon, FlaskConical,
  Leaf, Tag, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SmartImage } from "@/components/ui/smart-image";
import { ProductCard } from "@/components/product/product-card";
import { AUDIENCES, GOALS } from "@/lib/taxonomy";
import type { CategoryWithCount, ProductCardData } from "@/lib/queries";

// Иконки категорий по имени из БД (Category.icon) — как в category-tiles.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Pill, ShieldPlus, Flame, Mars, Venus, Baby, Dumbbell, BrainCircuit,
  Soup, Droplets, Bone, Activity, Sparkles, Droplet, Hexagon, FlaskConical, Leaf,
};

/** Русское склонение: 1 товар / 2 товара / 5 товаров. */
function productsLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} товар`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} товара`;
  return `${n} товаров`;
}

/**
 * Мобильный «хаб каталога» (как у Ozon/ВкусВилл): быстрая ориентация
 * по трём осям — «Зачем» (цели), «Кому» (аудитории) и категориям, плюс
 * лента хитов. Рендерится только на «чистом» /catalog без фильтров;
 * на десктопе скрыт (там остаётся сетка с боковым меню).
 */
export function CatalogHub({
  categories,
  hits,
}: {
  categories: CategoryWithCount[];
  hits: ProductCardData[];
}) {
  return (
    <Container className="space-y-7 pb-8 pt-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Каталог</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Натуральные витамины и БАД ХАЯТ — по целям и для всей семьи
        </p>
      </header>

      {/* ── «Зачем»: лента чипсов-целей ── */}
      <section aria-label="Подборки по целям">
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-1">
          <Link
            href="/sale"
            className="inline-flex min-h-10 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full bg-sale/10 px-4 text-sm font-semibold text-sale ring-1 ring-sale/20 transition active:bg-sale active:text-white"
          >
            <Tag className="h-4 w-4" aria-hidden />
            Распродажа
          </Link>
          {GOALS.map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.slug}
                href={`/goal/${g.slug}`}
                className="inline-flex min-h-10 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full bg-surface px-4 text-sm font-semibold text-ink ring-1 ring-line transition active:bg-brand-500 active:text-white"
              >
                <Icon className="h-4 w-4 text-brand-600" aria-hidden />
                {g.name}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── «Кому»: 3 крупные карточки в ряд ── */}
      <section aria-label="Кому">
        <h2 className="mb-3 text-lg font-extrabold tracking-tight">Кому</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {AUDIENCES.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.slug}
                href={`/for/${a.slug}`}
                className="group flex flex-col items-center gap-2 rounded-2xl bg-surface px-2 py-4 text-center shadow-xs ring-1 ring-line transition active:bg-brand-50"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-active:bg-brand-500 group-active:text-white">
                  <Icon className="h-6 w-6" strokeWidth={1.9} aria-hidden />
                </span>
                <span className="text-[13px] font-bold leading-tight text-ink">{a.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Категории: сетка плиток 2 колонки ── */}
      <section aria-label="Категории">
        <h2 className="mb-3 text-lg font-extrabold tracking-tight">Категории</h2>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((c) => {
            const Icon = (c.icon && CATEGORY_ICONS[c.icon]) || Leaf;
            return (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="group overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-line transition active:scale-[0.99]"
              >
                {c.image ? (
                  <SmartImage
                    src={c.image}
                    alt={c.name}
                    ratio="16/10"
                    rounded="rounded-none"
                    sizes="(max-width: 640px) 50vw, 320px"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-brand-50">
                    <Icon className="h-10 w-10 text-brand-500" strokeWidth={1.6} aria-hidden />
                  </div>
                )}
                <div className="p-3">
                  <div className="line-clamp-2 text-[13px] font-bold leading-snug text-ink">
                    {c.name}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-faint">
                    {productsLabel(c._count.products)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Хиты: горизонтальная лента ── */}
      {hits.length > 0 ? (
        <section aria-label="Хиты продаж">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight">Хиты продаж</h2>
            <Link
              href="/sale"
              className="inline-flex items-center gap-0.5 text-sm font-semibold text-brand-600"
            >
              Акции <ChevronRight className="h-4 w-4" aria-hidden />
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
