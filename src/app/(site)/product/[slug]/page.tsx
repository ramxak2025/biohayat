import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { ChevronRight, Truck, ShieldCheck, Info } from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductGrid } from "@/components/product/product-card";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { productMetadata, productJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { formatMoney, discountPercent } from "@/lib/utils";

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

  const [related, settings] = await Promise.all([
    getRelatedProducts(product.categoryId, product.id),
    getSettings(),
  ]);
  const discount = discountPercent(product.priceKopecks, product.oldPriceKopecks);
  const freeDelivery = product.priceKopecks >= settings.freeDeliveryThresholdKopecks;

  const tabs = [
    { title: "Описание", content: product.description },
    { title: "Состав", content: product.composition },
    { title: "Способ применения", content: product.usage },
    { title: "Противопоказания", content: product.contraindications },
  ].filter((t) => t.content);

  return (
    <Container className="py-5 sm:py-8">
      <Script id="ld-product" type="application/ld+json">
        {JSON.stringify(productJsonLd(product, settings))}
      </Script>
      <Script id="ld-breadcrumb" type="application/ld+json">
        {JSON.stringify(
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: product.category.name, path: `/category/${product.category.slug}` },
            { name: product.name, path: `/product/${product.slug}` },
          ]),
        )}
      </Script>

      {/* breadcrumbs */}
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-ink-faint">
        <Link href="/" className="hover:text-brand-700">Главная</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/category/${product.category.slug}`} className="hover:text-brand-700">
          {product.category.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-ink-muted">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <div className="flex flex-wrap gap-1.5">
            {discount ? <Badge tone="sale">−{discount}%</Badge> : null}
            {product.badges.map((b) => (
              <Badge key={b} tone="accent">{b}</Badge>
            ))}
            <Badge tone={product.inStock ? "success" : "neutral"}>
              {product.inStock ? "В наличии" : "Нет в наличии"}
            </Badge>
          </div>

          <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">
            {product.name}
          </h1>
          {product.volume ? (
            <p className="mt-1 text-ink-muted">{product.volume}</p>
          ) : null}
          {product.shortDescription ? (
            <p className="mt-3 text-ink-muted">{product.shortDescription}</p>
          ) : null}

          <div className="mt-5 flex items-end gap-3">
            <span className="text-3xl font-extrabold">{formatMoney(product.priceKopecks)}</span>
            {product.oldPriceKopecks ? (
              <span className="pb-1 text-lg font-medium text-ink-faint line-through">
                {formatMoney(product.oldPriceKopecks)}
              </span>
            ) : null}
          </div>

          <div className="mt-5 max-w-sm">
            <AddToCartButton
              full
              size="lg"
              item={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                priceKopecks: product.priceKopecks,
                image: product.images[0]?.url,
              }}
            />
          </div>

          <div className="mt-5 space-y-2.5 rounded-2xl bg-surface-soft p-4 text-sm">
            <div className="flex items-center gap-2.5">
              <Truck className="h-5 w-5 text-brand-500" />
              <span>
                {freeDelivery
                  ? "Бесплатная доставка этого товара по России"
                  : `Бесплатная доставка от ${formatMoney(settings.freeDeliveryThresholdKopecks)}`}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-brand-500" />
              <span>Сертифицированная продукция, производство ООО «Восток»</span>
            </div>
          </div>

          {/* дисклеймер БАД (152-ФЗ / реклама БАД) */}
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-600">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{settings.badDisclaimer}</span>
          </div>
        </div>
      </div>

      {/* характеристики / табы */}
      {tabs.length > 0 ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {tabs.map((t) => (
            <div key={t.title} className="rounded-2xl bg-surface p-5 ring-1 ring-line">
              <h2 className="mb-2 text-lg font-bold">{t.title}</h2>
              <div className="whitespace-pre-line leading-relaxed text-ink-muted">
                {t.content}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {related.length > 0 ? (
        <Section>
          <SectionHeader title="Похожие товары" />
          <ProductGrid products={related} />
        </Section>
      ) : null}
    </Container>
  );
}
