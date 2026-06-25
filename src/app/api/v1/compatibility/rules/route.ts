import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { serializeCompatibility } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/compatibility/rules — активные правила совместимости БАД. */
export async function GET() {
  try {
    const rules = await prisma.compatibilityRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return apiOk(rules.map(serializeCompatibility));
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
