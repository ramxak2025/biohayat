import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { getNavCategories } from "@/lib/queries";
import { serializeCategory } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/categories — корневые категории навигации. */
export async function GET() {
  try {
    const categories = await getNavCategories();
    return apiOk(categories.map(serializeCategory));
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
