import type { NextRequest } from "next/server";
import { apiOk, apiError, apiPreflight, parsePaging } from "@/lib/api/response";
import { getProducts } from "@/lib/queries";
import { serializeProduct } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/products — каталог с фильтрами и пагинацией. */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { take, skip } = parsePaging(url, 24, 100);
    const sp = url.searchParams;

    const { items, total } = await getProducts({
      categorySlug: sp.get("category") || undefined,
      audience: sp.get("audience") || undefined,
      goal: sp.get("goal") || undefined,
      featured: sp.get("featured") === "true",
      onSale: sp.get("onSale") === "true",
      search: sp.get("q") || undefined,
      take,
      skip,
    });

    return apiOk({ items: items.map(serializeProduct), total, take, skip });
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
