import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { NUTRIENT_KEYWORDS } from "@/lib/taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/**
 * GET /api/v1/compatibility/components — уникальный отсортированный (ru) список
 * имён компонентов: объединение ключей NUTRIENT_KEYWORDS и componentA/B из активных правил.
 */
export async function GET() {
  try {
    const rules = await prisma.compatibilityRule.findMany({
      where: { isActive: true },
      select: { componentA: true, componentB: true },
    });

    const set = new Set<string>(Object.keys(NUTRIENT_KEYWORDS));
    for (const r of rules) {
      set.add(r.componentA);
      set.add(r.componentB);
    }

    const components = [...set].sort((a, b) => a.localeCompare(b, "ru"));
    return apiOk(components);
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
