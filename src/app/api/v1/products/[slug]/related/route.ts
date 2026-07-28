import { apiOk, apiError, apiPreflight, apiInternal } from "@/lib/api/response";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries";
import { serializeProduct } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/products/[slug]/related — похожие товары той же категории. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product || !product.isActive) {
      return apiError("Товар не найден", 404, "NOT_FOUND");
    }
    const url = new URL(req.url);
    const takeRaw = Number(url.searchParams.get("take"));
    const take = takeRaw > 0 ? Math.min(24, takeRaw) : 8;

    const related = await getRelatedProducts(product.categoryId, product.id, take);
    return apiOk(related.map(serializeProduct));
  } catch (e) {
    return apiInternal("api/v1/products/[slug]/related", e);
  }
}
