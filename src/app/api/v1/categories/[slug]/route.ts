import { apiOk, apiError, apiPreflight, apiInternal } from "@/lib/api/response";
import { getCategoryBySlug } from "@/lib/queries";
import { serializeCategory } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/categories/[slug] — категория по slug. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const category = await getCategoryBySlug(slug);
    if (!category) {
      return apiError("Категория не найдена", 404, "NOT_FOUND");
    }
    return apiOk(serializeCategory(category));
  } catch (e) {
    return apiInternal("api/v1/categories/[slug]", e);
  }
}
