import type { NextRequest } from "next/server";
import { apiOk, apiPreflight, apiInternal } from "@/lib/api/response";
import { searchSuggestions } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/search/suggestions — подсказки живого поиска. */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const limitRaw = Number(url.searchParams.get("limit"));
    const limit = limitRaw > 0 ? Math.min(20, limitRaw) : 6;

    const suggestions = await searchSuggestions(q, limit);
    return apiOk(suggestions);
  } catch (e) {
    return apiInternal("api/v1/search/suggestions", e);
  }
}
