import { absoluteUrl } from "@/lib/seo";
import { formatMoney, discountPercent } from "@/lib/utils";
import { ORDER_STATUS_LABELS, trackingUrl } from "@/lib/order-status";
import type {
  Product, ProductImage, Category, Banner, Material, Order, OrderItem,
  SiteSettings, CompatibilityRule, IntakePlan, IntakeLog, ConsultationRequest,
} from "@prisma/client";

/** Деньги в едином формате: копейки + рубли + готовая строка. */
function money(kopecks: number) {
  return { kopecks, rub: kopecks / 100, formatted: formatMoney(kopecks) };
}

type ProductFull = Product & { images?: ProductImage[]; category?: Category | null };

export function serializeProduct(p: ProductFull) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    description: p.description,
    composition: p.composition,
    usage: p.usage,
    contraindications: p.contraindications,
    volume: p.volume,
    sku: p.sku,
    price: money(p.priceKopecks),
    oldPrice: p.oldPriceKopecks ? money(p.oldPriceKopecks) : null,
    discountPercent: discountPercent(p.priceKopecks, p.oldPriceKopecks),
    inStock: p.inStock,
    isFeatured: p.isFeatured,
    badges: p.badges,
    audiences: p.audiences,
    goals: p.goals,
    nutrients: p.nutrients,
    category: p.category ? { slug: p.category.slug, name: p.category.name } : null,
    images: (p.images ?? []).map((i) => ({ url: absoluteUrl(i.url), alt: i.alt })),
    image: p.images?.[0] ? absoluteUrl(p.images[0].url) : null,
  };
}

export function serializeCategory(c: Category) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon: c.icon,
    image: c.image ? absoluteUrl(c.image) : null,
    sortOrder: c.sortOrder,
  };
}

export function serializeBanner(b: Banner) {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    image: b.image ? absoluteUrl(b.image) : null,
    imageMobile: b.imageMobile ? absoluteUrl(b.imageMobile) : null,
    ctaLabel: b.ctaLabel,
    link: b.link,
    placement: b.placement,
    bgColor: b.bgColor,
  };
}

export function serializeMaterial(m: Material, withContent = false) {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    excerpt: m.excerpt,
    coverImage: m.coverImage ? absoluteUrl(m.coverImage) : null,
    publishedAt: m.publishedAt,
    ...(withContent ? { content: m.content } : {}),
  };
}

export function serializeOrder(o: Order & { items?: OrderItem[] }) {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    statusLabel: ORDER_STATUS_LABELS[o.status],
    total: money(o.totalKopecks),
    customerName: o.customerName,
    phone: o.phone,
    address: o.address,
    comment: o.comment,
    createdAt: o.createdAt,
    tracking: o.trackingNumber
      ? { number: o.trackingNumber, carrier: o.trackingCarrier, url: trackingUrl(o.trackingCarrier, o.trackingNumber) }
      : null,
    items: (o.items ?? []).map((it) => ({
      name: it.name,
      qty: it.qty,
      price: money(it.priceKopecks),
      lineTotal: money(it.priceKopecks * it.qty),
    })),
  };
}

/** Только публичные настройки (без секретов вебхуков). */
export function serializeSettings(s: SiteSettings) {
  return {
    siteName: s.siteName,
    phone: s.phone,
    email: s.email,
    address: s.address,
    workingHours: s.workingHours,
    socials: {
      instagram: s.instagram,
      telegram: s.telegram,
      whatsapp: s.whatsapp,
      vk: s.vk,
      wildberries: s.wildberries,
    },
    legal: { name: s.legalName, inn: s.inn, ogrn: s.ogrn, address: s.legalAddress },
    freeDeliveryThreshold: money(s.freeDeliveryThresholdKopecks),
    badDisclaimer: s.badDisclaimer,
  };
}

export function serializeCompatibility(r: CompatibilityRule) {
  return {
    id: r.id,
    componentA: r.componentA,
    componentB: r.componentB,
    type: r.type,
    note: r.note,
  };
}

export function serializeIntakePlan(p: IntakePlan & { logs?: IntakeLog[] }) {
  return {
    id: p.id,
    title: p.title,
    productId: p.productId,
    times: p.times,
    startDate: p.startDate,
    durationDays: p.durationDays,
    note: p.note,
    isActive: p.isActive,
    logs: (p.logs ?? []).map((l) => ({ day: l.day, slot: l.slot, takenAt: l.takenAt })),
  };
}

export function serializeConsultation(c: ConsultationRequest) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    topic: c.topic,
    message: c.message,
    status: c.status,
    createdAt: c.createdAt,
  };
}
