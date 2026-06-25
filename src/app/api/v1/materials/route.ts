import type { NextRequest } from "next/server";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { getPublishedMaterials } from "@/lib/queries";
import { serializeMaterial } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/materials — опубликованные материалы (без content). */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const takeRaw = Number(url.searchParams.get("take"));
    const take = takeRaw > 0 ? Math.min(100, takeRaw) : undefined;

    const materials = await getPublishedMaterials(take);
    return apiOk(materials.map((m) => serializeMaterial(m)));
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
