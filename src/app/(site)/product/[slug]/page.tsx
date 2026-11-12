import { productDirection } from "../../../../../shared/catalog-directions";
import { DirectionMark } from "@/components/site/direction-mark";
import { VysotaPhoto } from "@/components/site/vysota-photo";
import type { Metadata } from "next";
import { ListLink as Link } from "@/components/ui/list-link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Truck } from "lucide-react";
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
  const direction = productDirection(product.direction);
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
    <div data-direction={direction.id}>
      <Script id="ld-product" type="application/ld+json">
        {JSON.stringify(productJsonLd(product, settings, reviewStats))}
      </Script>
      <RecentlyViewedTracker item={cartItem} />
      <Script id="ld-breadcrumb" type="application/ld+json">
        {JSON.stringify(
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: direction.label, path: direction.path },
            { name: product.category.name, path: `/category/${product.category.slug}` },
            { name: product.name, path: `/product/${product.slug}` },
          ]),
        )}
      </Script>

      <div className="vysota-dark vysota-hero product-masthead">
        <VysotaPhoto scene={direction.id} primary />
        <Container>
          <nav className="vysota-breadcrumbs" aria-label="Хлебные крошки">
            <Link href="/">Главная</Link><span aria-hidden="true">/</span>
            <Link href={direction.path}>{direction.label}</Link><span aria-hidden="true">/</span>
            <Link href={`/category/${product.category.slug}`}>{product.category.name}</Link>
            <span className="hidden lg:inline" aria-hidden="true">/</span>
            <span className="sr-only lg:not-sr-only" aria-current="page">{product.name}</span>
          </nav>
        </Container>
      </div>

      <Container className="product-detail-grid">
        <div className="product-detail-gallery">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div className="product-detail-identity">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={direction.path} className="flex min-h-11 items-center text-sm font-medium hover:underline">
              <DirectionMark direction={direction} />
            </Link>
            {product.sku ? <span className="text-sm text-ink-muted">Артикул {product.sku}</span> : null}
            {product.badges.map((badge) => <Badge key={badge} tone="accent">{badge}</Badge>)}
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

          <h1 className="product-detail-title">{product.name}</h1>
          {product.volume ? <p className="mt-3 text-sm font-medium text-ink-muted">{product.volume}</p> : null}
        </div>

        <div className="product-detail-purchase">
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

          <div id="buy-area" className="product-detail-buy">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="tnum font-display text-3xl font-medium tracking-tight">
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

            <AddToCartButton
              full
              size="lg"
              item={cartItem}
              inStock={available}
              maxQty={product.stockQty ?? 99}
            />
          </div>
        </div>

        {product.shortDescription ? (
          <p className="product-detail-description max-w-prose text-base leading-relaxed text-ink-muted sm:text-lg">{product.shortDescription}</p>
        ) : null}

        <div className="product-detail-notes">
          <div className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
            <Truck size={18} strokeWidth={1.6} aria-hidden="true" />
            {freeDelivery ? "Бесплатная доставка этого товара по России" : `Бесплатная доставка от ${formatMoney(settings.freeDeliveryThresholdKopecks)}`}
          </div>

          {/* Дисклеймер БАД (реклама БАД). Не «мелкая сноска»: это ровно то
              место, где покупатель принимает решение, и предупреждение здесь
              обязано читаться — 13px и мера по ширине колонки. */}
          <p className="mt-5 max-w-[60ch] border-t border-line pt-3 text-[13px] leading-relaxed text-ink-muted">
            БАД. Не является лекарственным средством. Перед применением проконсультируйтесь со специалистом.
          </p>
        </div>
      </Container>

      {tabs.length > 0 ? (
        <section className="bg-mist-2 py-9 lg:py-16">
          <Container className="grid items-start gap-4 md:grid-cols-2">
            {tabs.map((tab) => (
              <article key={tab.title} className="rounded-[var(--r-xl)] border border-line bg-white p-6 sm:p-8">
                <h2 className="mb-3 font-display text-xl font-medium tracking-tight">{tab.title}</h2>
                <p className="max-w-prose whitespace-pre-line break-words leading-relaxed text-ink-muted">{tab.content}</p>
              </article>
            ))}
          </Container>
        </section>
      ) : null}

      <Container>
        {/* отзывы */}
        <Section id="reviews">
          <div className="mb-5">
            <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">Отзывы</h2>
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
              <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">Полезно почитать</h2>
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
              <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">Похожие товары</h2>
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

      </Container>

      {/* мобильная панель покупки */}
      <StickyBuyBar
        item={cartItem}
        oldPriceKopecks={product.oldPriceKopecks}
        inStock={available}
        maxQty={product.stockQty ?? 99}
      />
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
