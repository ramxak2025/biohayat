import { TrackerError } from "@/lib/tracker-service";
import { toggleIntakeLog, IntakeLogError } from "@/lib/intake-log";
import { z } from "zod";
import { apiOk, apiError, apiPreflight, apiInternal } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { MAX_LOGS, findOwnPlan, isCalendarDay, parseRange, planNotFound } from "../../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

const postSchema = z.object({
  day: z.string().min(1).max(10),
  slot: z.string().min(1).max(16),
});

/**
 * POST /api/v2/intake/[planId]/logs — переключить отметку приёма (toggle).
 *
 * Тело: `{ day: "YYYY-MM-DD", slot: "09:00" }`.
 * Ответ: `{ taken, day, slot }`, где `taken: true` — отметка поставлена,
 * `taken: false` — снята. Клиент не должен угадывать итог по своему состоянию:
 * при гонке двух устройств истина — в ответе.
 *
 * `slot` обязан присутствовать в `plan.times`: раньше любая строка создавала
 * «осиротевшую» отметку, которую интерфейс уже никогда не покажет.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const { planId } = await params;
    const plan = await findOwnPlan(planId, session.sub);
    if (!plan) return planNotFound();
    if ((plan.scheduleVersion > 1 || plan.intervalDays !== 1) && new URL(req.url).searchParams.get("capabilities") !== "interval-v1") return apiError("Обновите приложение для этого расписания", 409, "UPGRADE_REQUIRED");

    const body = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    const day = parsed.data.day.trim();
    if (!isCalendarDay(day)) {
      return apiError("Некорректная дата: ожидается формат YYYY-MM-DD", 400, "VALIDATION");
    }

    const slot = parsed.data.slot.trim();
    if (!plan.times.includes(slot)) {
      return apiError("Такого времени приёма нет в курсе", 400, "VALIDATION");
    }

    return apiOk(await toggleIntakeLog(session.sub, plan.id, day, slot));
  } catch (e) {
    if (e instanceof TrackerError) return apiError(e.message, e.status, e.code);
    if (e instanceof IntakeLogError) return apiError(e.message, e.code === "NOT_FOUND" ? 404 : 400, e.code);
    return apiInternal("api/v2/intake/[planId]/logs", e);
  }
}

/**
 * GET /api/v2/intake/[planId]/logs?from&to — отметки одного курса за период.
 * Без параметров — последние 30 дней; ширина периода ограничена 92 днями.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const { planId } = await params;
    const plan = await findOwnPlan(planId, session.sub);
    if (!plan) return planNotFound();
    if ((plan.scheduleVersion > 1 || plan.intervalDays !== 1) && new URL(req.url).searchParams.get("capabilities") !== "interval-v1") return apiError("Обновите приложение для этого расписания", 409, "UPGRADE_REQUIRED");

    const range = parseRange(new URL(req.url));
    if (!range.ok) return range.res;
    const { from, to } = range.value;

    const logs = await prisma.intakeLog.findMany({
      where: { planId: plan.id, taken: true, day: { gte: from, lte: to } },
      orderBy: [{ day: "asc" }, { slot: "asc" }],
      take: MAX_LOGS,
    });

    return apiOk(
      logs.map((l) => ({ day: l.day, slot: l.slot, takenAt: l.takenAt })),
      { headers: { "X-Intake-From": from, "X-Intake-To": to } },
    );
  } catch (e) {
    if (e instanceof TrackerError) return apiError(e.message, e.status, e.code);
    if (e instanceof IntakeLogError) return apiError(e.message, e.code === "NOT_FOUND" ? 404 : 400, e.code);
    return apiInternal("api/v2/intake/[planId]/logs", e);
  }
}
