import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { getSettings } from "@/lib/settings";
import { serializeSettings } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/settings — публичные настройки сайта. */
export async function GET() {
  try {
    const settings = await getSettings();
    return apiOk(serializeSettings(settings));
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
