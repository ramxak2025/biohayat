// GET /api/v1/search?q= — быстрые подсказки для живого поиска (до 10 товаров).

import { type NextRequest } from "next/server";
import { smartSearchProducts } from "@/lib/search";
import { apiOk, withErrorHandling } from "../_lib/response";
import { serializeProductCard } from "../_lib/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: NextRequest) => {
  // Обрезаем запрос до 100 символов; короче 2 символов — пустой результат.
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100).trim();
  if (q.length < 2) return apiOk([], { query: q });

  const { items } = await smartSearchProducts(q, 10);
  return apiOk(items.map(serializeProductCard), { query: q });
});
