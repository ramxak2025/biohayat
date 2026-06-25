import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { getProductBySlug } from "@/lib/queries";
import { serializeProduct } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/products/[slug] — карточка товара. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product || !product.isActive) {
      return apiError("Товар не найден", 404, "NOT_FOUND");
    }
    return apiOk(serializeProduct(product));
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
