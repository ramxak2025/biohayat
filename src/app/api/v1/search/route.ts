import type { NextRequest } from "next/server";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { smartSearchProducts } from "@/lib/search";
import { serializeProduct } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/search — умный поиск товаров. */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const limitRaw = Number(url.searchParams.get("limit"));
    const limit = limitRaw > 0 ? Math.min(100, limitRaw) : 48;

    const { items, total, query } = await smartSearchProducts(q, limit);
    return apiOk({ items: items.map(serializeProduct), total, query });
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
