import type { NextRequest } from "next/server";
import { apiOk, apiPreflight, parsePaging, apiInternal, apiError } from "@/lib/api/response";
import { getProducts, isProductSort } from "@/lib/queries";
import { serializeProduct } from "@/lib/api/serializers";
import { productDirectionSchema } from "@/lib/product-direction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** Потолок PostgreSQL Int — тип колонки priceKopecks. */
const MAX_KOPECKS = 2_147_483_647;

/**
 * Цена из query-строки в копейках.
 * Нет параметра или пустая строка → undefined (фильтр не применяется),
 * мусор / дробное / отрицательное → null (ответим 400): цены в БД — Int
 * в копейках, и молча округлять чужой ввод опаснее, чем сказать о нём.
 *
 * Слишком большое число не ошибка, а подрезается до потолка Int: ползунок
 * «до бесконечности» на клиенте не должен ронять запрос (без подрезки Prisma
 * не смогла бы уложить значение в Int и роут отвечал бы 500). Смысл при этом
 * сохраняется: и priceTo, и priceFrom за границей Int дают тот же результат,
 * что и без подрезки.
 */
function parseKopecks(raw: string | null): number | undefined | null {
  if (raw == null) return undefined;
  const s = raw.trim();
  if (s === "") return undefined;
  if (!/^\d+$/.test(s)) return null;
  return Math.min(Number(s), MAX_KOPECKS);
}

/** GET /api/v2/products — каталог с фильтрами, сортировкой и пагинацией. */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { take, skip } = parsePaging(url, 24, 100);
    const sp = url.searchParams;
    const direction = productDirectionSchema.optional().safeParse(sp.get("direction") ?? undefined);
    if (!direction.success) return apiError("Неизвестное направление", 400, "VALIDATION");

    const ids = sp.has("ids") ? [...new Set((sp.get("ids") || "").split(",").filter(Boolean))] : undefined;
    if (ids && (ids.length === 0 || ids.length > 100 || ids.some(id => id.length > 64))) {
      return apiError("Укажите от 1 до 100 идентификаторов товаров", 400, "VALIDATION");
    }
    const priceFrom = parseKopecks(sp.get("priceFrom"));
    const priceTo = parseKopecks(sp.get("priceTo"));
    if (priceFrom === null || priceTo === null) {
      return apiError("priceFrom/priceTo — целое число копеек ≥ 0", 400, "VALIDATION");
    }
    if (priceFrom != null && priceTo != null && priceFrom > priceTo) {
      return apiError("priceFrom не может быть больше priceTo", 400, "VALIDATION");
    }

    // Неизвестное значение sort намеренно игнорируем (=> "popular"): клиент
    // со старым или опечатанным параметром должен получить каталог, а не 400.
    const sortRaw = sp.get("sort");
    const sort = isProductSort(sortRaw) ? sortRaw : undefined;

    const { items, total } = await getProducts({
      ids,
      direction: direction.data,
      categorySlug: sp.get("category") || undefined,
      audience: sp.get("audience") || undefined,
      goal: sp.get("goal") || undefined,
      featured: sp.get("featured") === "true",
      onSale: sp.get("onSale") === "true",
      search: sp.get("q") || undefined,
      sort,
      priceFrom,
      priceTo,
      inStock: sp.get("inStock") === "true",
      take,
      skip,
    });

    return apiOk({ items: items.map(serializeProduct), total, take, skip });
  } catch (e) {
    return apiInternal("api/v2/products", e);
  }
}
