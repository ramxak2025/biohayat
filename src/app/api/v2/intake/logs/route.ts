import { apiOk, apiError, apiPreflight, apiInternal } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { MAX_LOGS, parseRange } from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/**
 * GET /api/v2/intake/logs?from=YYYY-MM-DD&to=YYYY-MM-DD — отметки приёма
 * покупателя сразу по ВСЕМ курсам.
 *
 * Зачем: календарь недели/месяца и «стрик» рисуются одним запросом вместо N
 * (по запросу на курс) — на мобильной сети разница заметна.
 *
 * Без параметров — последние 30 дней от «сегодня» (`?day`/`?tz` учитываются);
 * ширина периода ограничена 92 днями.
 *
 * Статический сегмент `logs` имеет приоритет над соседним `[planId]`, поэтому
 * маршрут не конфликтует с `/intake/{planId}` (id курса — cuid, не «logs»).
 */
export async function GET(req: Request) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const range = parseRange(new URL(req.url));
    if (!range.ok) return range.res;
    const { from, to } = range.value;

    // Фильтр по связи: выбираются только курсы текущего покупателя.
    const logs = await prisma.intakeLog.findMany({
      where: { plan: { customerId: session.sub }, day: { gte: from, lte: to } },
      orderBy: [{ day: "asc" }, { slot: "asc" }],
      take: MAX_LOGS,
      select: { planId: true, day: true, slot: true, takenAt: true },
    });

    return apiOk(logs, { headers: { "X-Intake-From": from, "X-Intake-To": to } });
  } catch (e) {
    return apiInternal("api/v2/intake/logs", e);
  }
}
