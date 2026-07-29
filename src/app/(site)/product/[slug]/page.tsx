import type { Metadata } from "next";
import { ListLink as Link } from "@/components/ui/list-link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { ChevronRight, ChevronDown, Truck, ShieldCheck } from "lucide-react";
import { Container, Section } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductGrid } from "@/components/product/product-card";
import { ProductReviews, RatingStars } from "@/components/product/product-reviews";
import { StickyBuyBar } from "@/components/product/sticky-buy-bar";
import {
  RecentlyViewed,
  RecentlyViewedTracker,
} from "@/components/product/recently-viewed";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { SmartImage } from "@/components/ui/smart-image";
import {
  getProductBySlug,
  getRelatedProducts,
  getApprovedReviews,
  getMaterialsForProduct,
} from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { productMetadata, productJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { formatMoney, discountPercent } from "@/lib/utils";

// ISR: карточка товара отдаётся статически, перегенерация раз в 5 минут.
export const revalidate = 300;
// Регистрирует маршрут как ISR: страницы генерируются при первом запросе
// и кэшируются (на сборке БД не нужна, поэтому список пуст).
export function generateStaticParams() {
  return [];
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const settings = await getSettings();
  return productMetadata(product, settings);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  const [related, settings, reviews, articles] = await Promise.all([
    getRelatedProducts(product.categoryId, product.id),
    getSettings(),
    getApprovedReviews(product.id),
    getMaterialsForProduct(product),
  ]);
  const discount = discountPercent(product.priceKopecks, product.oldPriceKopecks);
  const freeDelivery = product.priceKopecks >= settings.freeDeliveryThresholdKopecks;
  // Учёт остатков: stockQty === null — выключен; 0 — товар закончился.
  const available = product.inStock && product.stockQty !== 0;
  const lowStock =
    available && product.stockQty !== null && product.stockQty >= 1 && product.stockQty <= 5;
  const reviewStats =
    reviews.length > 0
      ? {
          avg:
            Math.round(
              (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
            ) / 10,
          count: reviews.length,
        }
      : null;
  const cartItem = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    priceKopecks: product.priceKopecks,
    image: product.images[0]?.url,
  };

  const tabs = [
    { title: "Описание", content: product.description },
    { title: "Состав", content: product.composition },
    { title: "Способ применения", content: product.usage },
    { title: "Противопоказания", content: product.contraindications },
  ].filter((t) => t.content);

  return (
    <Container className="py-5 sm:py-8">
      <Script id="ld-product" type="application/ld+json">
        {JSON.stringify(productJsonLd(product, settings, reviewStats))}
      </Script>
      <RecentlyViewedTracker item={cartItem} />
      <Script id="ld-breadcrumb" type="application/ld+json">
        {JSON.stringify(
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: product.category.name, path: `/category/${product.category.slug}` },
            { name: product.name, path: `/product/${product.slug}` },
          ]),
        )}
      </Script>

      {/* хлебные крошки: одна строка, длинное название обрезается */}
      <nav
        aria-label="Хлебные крошки"
        className="mb-3 flex items-center gap-1 overflow-hidden whitespace-nowrap text-xs text-ink-faint"
      >
        <Link href="/" className="shrink-0 hover:text-brand-700">Главная</Link>
        <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        <Link
          href={`/category/${product.category.slug}`}
          className="shrink-0 hover:text-brand-700"
        >
          {product.category.name}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate text-ink-muted">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <ProductGallery images={product.images} name={product.name} />

        <div className="min-w-0">
          {/* чип категории + бейджи */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/category/${product.category.slug}`}
              className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold leading-none text-brand-700 transition hover:bg-brand-100"
            >
              {product.category.name}
            </Link>
            {product.badges.map((b) => (
              <Badge key={b} tone="accent">{b}</Badge>
            ))}
          </div>

          {product.brand && !product.brand.isOwn ? (
            <p className="mt-2 text-sm text-ink-muted">
              Бренд:{" "}
              <Link
                href={`/brand/${product.brand.slug}`}
                className="font-semibold text-ink hover:text-brand-700 hover:underline"
              >
                {product.brand.name}
              </Link>
            </p>
          ) : null}

          {/*
            line-height задан инлайном намеренно: глобальное правило
            `h1,h2{line-height:1.22; text-wrap:balance}` в globals.css не лежит
            в @layer и потому перебивает любые leading-* утилиты (каскадные
            слои Tailwind 4). На мобайле плотные 1.22 у многострочного
            extrabold-названия + balance со swap-шрифтом давали наложение
            строк друг на друга. Инлайновый стиль гарантированно побеждает.
          */}
          <h1
            className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl"
            style={{ lineHeight: 1.3, textWrap: "pretty" }}
          >
            {product.name}
          </h1>

          {reviewStats ? (
            <a
              href="#reviews"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-brand-700"
            >
              <RatingStars rating={reviewStats.avg} />
              <span className="tnum">
                {reviewStats.avg.toLocaleString("ru-RU")} · {reviewStats.count}{" "}
                {pluralReviews(reviewStats.count)}
              </span>
            </a>
          ) : null}

          {/* цена + старая цена + чип скидки + наличие */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="tnum text-3xl font-extrabold tracking-tight">
              {formatMoney(product.priceKopecks)}
            </span>
            {product.oldPriceKopecks ? (
              <span className="tnum text-lg font-medium text-ink-faint line-through">
                {formatMoney(product.oldPriceKopecks)}
              </span>
            ) : null}
            {discount ? <Badge tone="sale-soft">−{discount}%</Badge> : null}
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                available ? "text-brand-700" : "text-ink-faint"
              }`}
            >
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${
                  available ? "bg-brand-500" : "bg-line-strong"
                }`}
              />
              {available ? "В наличии" : "Нет в наличии"}
            </span>
            {lowStock ? <Badge tone="accent">Осталось {product.stockQty} шт</Badge> : null}
          </div>

          {product.volume ? (
            <p className="mt-2 text-sm text-ink-muted">{product.volume}</p>
          ) : null}
          {product.shortDescription ? (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
              {product.shortDescription}
            </p>
          ) : null}

          <div id="buy-area" className="mt-5 max-w-sm">
            <AddToCartButton
              full
              size="lg"
              item={cartItem}
              inStock={available}
              maxQty={product.stockQty ?? 99}
            />
          </div>

          {/* компактная полоса доверия */}
          <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-surface-soft p-3.5 text-xs leading-snug text-ink-muted">
            <div className="flex items-start gap-2">
              <Truck className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              <span>
                {freeDelivery
                  ? "Бесплатная доставка этого товара по России"
                  : `Бесплатная доставка от ${formatMoney(settings.freeDeliveryThresholdKopecks)}`}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              <span>Сертифицированная продукция, производство ООО «Восток»</span>
            </div>
          </div>

          {/* Дисклеймер БАД (реклама БАД). Не «мелкая сноска»: это ровно то
              место, где покупатель принимает решение, и предупреждение здесь
              обязано читаться — 13px и мера по ширине колонки. */}
          <p className="mt-5 max-w-[60ch] border-t border-line pt-3 text-[13px] leading-relaxed text-ink-muted">
            {settings.badDisclaimer}
          </p>
        </div>
      </div>

      {/* описание / состав / применение / противопоказания — аккордеоны */}
      {tabs.length > 0 ? (
        <div className="mt-8 rounded-2xl bg-surface px-4 ring-1 ring-line sm:mt-10 sm:px-5">
          <div className="divide-y divide-line">
            {tabs.map((t, i) => (
              <details key={t.title} className="group" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                  <h2 className="text-[15px] font-bold sm:text-base">{t.title}</h2>
                  <ChevronDown
                    aria-hidden
                    className="h-5 w-5 shrink-0 text-ink-faint transition-transform group-open:rotate-180"
                  />
                </summary>
                {/* Мера 68 символов вместо max-w-3xl: на десктопе строка
                    описания доходила до 96 знаков, глаз терял начало
                    следующей строки. */}
                <div className="max-w-[68ch] whitespace-pre-line pb-4 leading-relaxed text-ink-muted">
                  {t.content}
                </div>
              </details>
            ))}
          </div>
        </div>
      ) : null}

      {/* отзывы */}
      <Section id="reviews" className="scroll-mt-24">
        <div className="mb-5">
          <h2 className="text-xl font-extrabold tracking-tight">Отзывы</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Публикуются после модерации — только честные впечатления
          </p>
        </div>
        <ProductReviews productId={product.id} reviews={reviews} />
      </Section>

      {/* кросс-линковка: статьи по целям товара */}
      {articles.length > 0 ? (
        <Section className="pt-0">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-extrabold tracking-tight">Полезно почитать</h2>
            <Link
              href="/articles"
              className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Все →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {articles.slice(0, 3).map((m) => (
              <Link
                key={m.id}
                href={`/articles/${m.slug}`}
                className="group flex items-center gap-3 overflow-hidden rounded-2xl bg-surface p-2.5 shadow-xs ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md sm:block sm:p-0"
              >
                <SmartImage
                  src={m.coverImage}
                  alt={m.title}
                  ratio="16/9"
                  rounded="rounded-xl"
                  label={m.title}
                  spec="1200×675"
                  sizes="(max-width: 640px) 40vw, 33vw"
                  className="w-28 shrink-0 sm:w-auto sm:rounded-none"
                />
                <div className="min-w-0 sm:p-4">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-brand-700 sm:text-base">
                    {m.title}
                  </h3>
                  {m.publishedAt ? (
                    <time className="mt-1 block text-xs text-ink-faint">
                      {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(
                        m.publishedAt,
                      )}
                    </time>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section className="pt-0">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-extrabold tracking-tight">Похожие товары</h2>
            <Link
              href={`/category/${product.category.slug}`}
              className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Все →
            </Link>
          </div>
          <ProductGrid products={related} />
        </Section>
      ) : null}

      <RecentlyViewed excludeId={product.id} className="py-10 sm:py-14" />

      {/* мобильная панель покупки */}
      <StickyBuyBar
        item={cartItem}
        oldPriceKopecks={product.oldPriceKopecks}
        inStock={available}
        maxQty={product.stockQty ?? 99}
      />
    </Container>
  );
}

function pluralReviews(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "отзыв";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "отзыва";
  return "отзывов";
}
