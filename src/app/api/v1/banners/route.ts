import type { NextRequest } from "next/server";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { getBanners } from "@/lib/queries";
import { serializeBanner } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

const PLACEMENTS = ["HERO", "HOME_STRIP", "CATEGORY", "SIDEBAR", "POPUP"] as const;
type Placement = (typeof PLACEMENTS)[number];

/** GET /api/v1/banners — баннеры по размещению (по умолчанию HERO). */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const raw = (url.searchParams.get("placement") || "HERO").toUpperCase();
    const placement: Placement = (PLACEMENTS as readonly string[]).includes(raw)
      ? (raw as Placement)
      : "HERO";

    const banners = await getBanners(placement);
    return apiOk(banners.map(serializeBanner));
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
