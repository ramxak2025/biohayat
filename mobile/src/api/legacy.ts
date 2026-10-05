/**
 * Совместимость со старой версией бэкенда.
 *
 * На проде сейчас развёрнута сборка, которая старше репозитория: конверт ответа
 * `{ok:true,data}` вместо `{data}`, список товаров приходит голым массивом,
 * деньги — целым `priceKopecks` вместо объекта Money, картинки — относительными
 * путями. Плюс там нет /auth, /intake, /favorites и ещё десятка маршрутов.
 *
 * Адаптер приводит старые ответы к актуальному контракту, поэтому приложение
 * работает и до обновления сервера (витрина), и после (полный функционал) — без
 * новой сборки в TestFlight. Когда прод обновят, все ветки ниже просто перестают
 * срабатывать: признак старого формата исчезает.
 */
import { formatKopecks } from "@/lib/format";
import type { Money, Paged, Product, Settings } from "./types";

let legacyDetected = false;

/** true, если сервер отвечает в старом формате — UI может честно предупредить. */
export function isLegacyApi(): boolean {
  return legacyDetected;
}

export function markLegacy(): void {
  legacyDetected = true;
}

function money(kopecks: number): Money {
  return { kopecks, rub: kopecks / 100, formatted: formatKopecks(kopecks) };
}

interface LegacyProduct {
  priceKopecks?: number;
  oldPriceKopecks?: number | null;
  image?: string | null;
  images?: { url: string; alt?: string | null }[];
  price?: Money;
  [k: string]: unknown;
}

/** Достраивает товар старого формата до текущего типа Product. */
export function adaptProduct<T>(raw: T): T {
  const p = raw as LegacyProduct;
  if (!p || typeof p !== "object" || p.price || typeof p.priceKopecks !== "number") return raw;

  markLegacy();
  const price = money(p.priceKopecks);
  const oldPrice = p.oldPriceKopecks ? money(p.oldPriceKopecks) : null;
  const images = (p.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? null }));

  return {
    ...(p as object),
    price,
    oldPrice,
    discountPercent:
      oldPrice && oldPrice.kopecks > price.kopecks
        ? Math.round((1 - price.kopecks / oldPrice.kopecks) * 100)
        : null,
    images,
    image: p.image ?? images[0]?.url ?? null,
    // поля, которых в старой выдаче может не быть
    isFeatured: (p.isFeatured as boolean) ?? false,
    badges: (p.badges as string[]) ?? [],
    audiences: (p.audiences as string[]) ?? [],
    goals: (p.goals as string[]) ?? [],
    nutrients: (p.nutrients as string[]) ?? [],
    volume: (p.volume as string | null) ?? null,
    sku: (p.sku as string | null) ?? null,
  } as T;
}

/** Старый /products отдаёт массив вместо страницы — заворачиваем. */
export function adaptPage(raw: unknown, take: number, skip: number): Paged<Product> {
  if (Array.isArray(raw)) {
    markLegacy();
    const items = raw.map((p) => adaptProduct(p)) as Product[];
    // total сервер не отдаёт: считаем, что страница последняя, если она неполная
    return { items, total: skip + items.length + (items.length === take ? take : 0), take, skip };
  }
  const page = raw as Paged<Product>;
  return { ...page, items: (page.items ?? []).map((p) => adaptProduct(p)) };
}

/**
 * Старый /settings отдаёт порог доставки целым числом копеек и не отдаёт
 * реквизиты. Без этого приложение падало на главной: settings.freeDeliveryThreshold
 * был undefined, а компоненты читали у него .kopecks.
 */
export function adaptSettings(raw: Settings): Settings {
  const legacy = raw as Settings & { freeDeliveryThresholdKopecks?: number };
  if (raw?.freeDeliveryThreshold || typeof legacy.freeDeliveryThresholdKopecks !== "number") return raw;
  markLegacy();
  return { ...raw, freeDeliveryThreshold: money(legacy.freeDeliveryThresholdKopecks) };
}

/** Маршруты, которых в старой сборке нет: 404 на них — не «не найдено», а «сервер не обновлён». */
const MISSING_ON_LEGACY = [
  "/auth", "/intake", "/favorites", "/orders", "/devices",
  "/consultations", "/materials", "/taxonomy", "/banners", "/compatibility", "/addresses",
];

export function isMissingOnLegacy(path: string): boolean {
  return MISSING_ON_LEGACY.some((p) => path.startsWith(p));
}

export const LEGACY_UNAVAILABLE_MESSAGE =
  "Раздел станет доступен после обновления сервера. Каталог и заказ по телефону работают.";
