import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { getMaterialBySlug } from "@/lib/queries";
import { serializeMaterial } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/materials/[slug] — материал с содержимым. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const material = await getMaterialBySlug(slug);
    if (!material || !material.isPublished) {
      return apiError("Материал не найден", 404, "NOT_FOUND");
    }
    return apiOk(serializeMaterial(material, true));
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
