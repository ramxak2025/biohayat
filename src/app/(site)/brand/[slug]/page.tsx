import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { MapPin } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SmartImage } from "@/components/ui/smart-image";
import { ProductGrid } from "@/components/product/product-card";
import { getBrandBySlug } from "@/lib/brands";
import { getProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { brandMetadata, breadcrumbJsonLd } from "@/lib/seo";

// ISR: страница бренда отдаётся статически, перегенерация раз в 5 минут.
export const revalidate = 300;
// Регистрирует маршрут как ISR без обращения к БД на сборке.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return {};
  const settings = await getSettings();
  return brandMetadata(brand, settings);
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand || !brand.isActive) notFound();

  const { items, total } = await getProducts({ brandSlug: slug, take: 60 });

  return (
    <Container className="py-6 sm:py-8">
      <Script id="ld-breadcrumb" type="application/ld+json">
        {JSON.stringify(
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Каталог", path: "/catalog" },
            { name: brand.name, path: `/brand/${brand.slug}` },
          ]),
        )}
      </Script>

      {/* ── Шапка бренда: логотип на белой плитке + название/страна/описание ── */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow-xs ring-1 ring-line sm:h-28 sm:w-28">
          <SmartImage
            src={brand.logo}
            alt={brand.name}
            ratio="1/1"
            rounded="rounded-xl"
            label={brand.name}
            spec="600×600"
            sizes="112px"
            className="w-full"
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{brand.name}</h1>
          {brand.country ? (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
              <MapPin className="h-4 w-4 text-brand-500" aria-hidden />
              {brand.country}
            </p>
          ) : null}
          {brand.description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {brand.description}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-ink-faint">{total} товаров</p>
        </div>
      </header>

      {products(items)}
    </Container>
  );
}

/** Сетка товаров бренда либо пустое состояние. */
function products(items: Awaited<ReturnType<typeof getProducts>>["items"]) {
  if (items.length > 0) return <ProductGrid products={items} />;
  return (
    <div className="rounded-2xl bg-surface-soft px-6 py-16 text-center">
      <p className="text-lg font-bold">Пока нет товаров этого бренда</p>
      <p className="mt-1 text-ink-muted">Скоро здесь появятся новинки.</p>
    </div>
  );
}
