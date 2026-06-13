import type { Metadata } from "next";
import type { Brand, Category, Material, Product, ProductImage, SiteSettings } from "@prisma/client";
import { formatMoney, truncate } from "@/lib/utils";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Применяет шаблон заголовка из настроек: "%s — ХАЯТ". */
function applyTitleTemplate(title: string, settings: SiteSettings): string {
  if (!settings.titleTemplate?.includes("%s")) return title;
  return settings.titleTemplate.replace("%s", title);
}

interface BuildMetaInput {
  title?: string;
  description?: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  noTemplate?: boolean;
  noindex?: boolean;
}

/** Универсальный билдер метаданных страницы. */
export function buildMetadata(input: BuildMetaInput, settings: SiteSettings): Metadata {
  const rawTitle = input.title || settings.defaultMetaTitle;
  const title =
    input.noTemplate || rawTitle === settings.defaultMetaTitle
      ? rawTitle
      : applyTitleTemplate(rawTitle, settings);
  const description = truncate(
    input.description || settings.defaultMetaDescription,
    300,
  );
  const url = absoluteUrl(input.path);
  const image = input.image
    ? absoluteUrl(input.image)
    : settings.defaultOgImage
      ? absoluteUrl(settings.defaultOgImage)
      : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: input.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: settings.siteName,
      locale: "ru_RU",
      type: input.type || "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** Автогенерация SEO-полей для товара (если не заданы вручную). */
export function productMetadata(
  product: Product & { images: ProductImage[]; category: Category },
  settings: SiteSettings,
): Metadata {
  const title =
    product.metaTitle ||
    `${product.name} — купить, цена ${formatMoney(product.priceKopecks)}`;
  const description =
    product.metaDescription ||
    product.shortDescription ||
    `${product.name}. ${product.category.name}. Натуральная продукция ХАЯТ. Доставка по России.`;
  return buildMetadata(
    {
      title,
      description,
      path: `/product/${product.slug}`,
      image: product.ogImage || product.images[0]?.url || null,
    },
    settings,
  );
}

export function categoryMetadata(category: Category, settings: SiteSettings): Metadata {
  const title = category.metaTitle || `${category.name} — каталог`;
  const description =
    category.metaDescription ||
    category.description ||
    `${category.name}: натуральные витамины и БАД от компании ХАЯТ. Купить с доставкой по России.`;
  return buildMetadata(
    {
      title,
      description,
      path: `/category/${category.slug}`,
      image: category.ogImage || category.image,
    },
    settings,
  );
}

export function brandMetadata(brand: Brand, settings: SiteSettings): Metadata {
  const title = brand.metaTitle || `${brand.name} — каталог бренда`;
  const description =
    brand.metaDescription ||
    brand.description ||
    `${brand.name}${brand.country ? `, ${brand.country}` : ""}: товары бренда в каталоге ХАЯТ. Купить с доставкой по России.`;
  return buildMetadata(
    {
      title,
      description,
      path: `/brand/${brand.slug}`,
      image: brand.logo,
    },
    settings,
  );
}

export function materialMetadata(material: Material, settings: SiteSettings): Metadata {
  return buildMetadata(
    {
      title: material.metaTitle || material.title,
      description: material.metaDescription || material.excerpt || undefined,
      path: `/articles/${material.slug}`,
      image: material.ogImage || material.coverImage,
      type: "article",
    },
    settings,
  );
}

/* ─────────── JSON-LD структурированные данные ─────────── */

export function organizationJsonLd(settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.legalName || settings.siteName,
    url: siteUrl(),
    logo: absoluteUrl("/logo.svg"),
    telephone: settings.phone,
    email: settings.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      addressCountry: "RU",
    },
    ...(settings.inn ? { taxID: settings.inn } : {}),
  };
}

export function productJsonLd(
  product: Product & { images: ProductImage[]; category: Category },
  settings: SiteSettings,
  /** Агрегация одобренных отзывов; передаётся, если отзывы есть. */
  reviewStats?: { avg: number; count: number } | null,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description || product.name,
    sku: product.sku || undefined,
    category: product.category.name,
    image: product.images.map((i) => absoluteUrl(i.url)),
    brand: { "@type": "Brand", name: settings.siteName },
    ...(reviewStats && reviewStats.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewStats.avg.toFixed(1),
            reviewCount: reviewStats.count,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: "RUB",
      price: (product.priceKopecks / 100).toFixed(2),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}
