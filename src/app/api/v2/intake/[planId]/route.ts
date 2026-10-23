import { mutateLegacyPlan, TrackerError } from "@/lib/tracker-service";
import { z } from "zod";
import { apiOk, apiError, apiPreflight, apiInternal } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeIntakePlan } from "@/lib/api/serializers";
import { MAX_TIMES, findOwnPlan, normalizeTimes, planNotFound, resolveDay } from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/**
 * Редактируемые поля курса. Неизвестные ключи игнорируются (zod strip).
 * `durationDays` и `note` принимают null — так поле очищается.
 */
const patchSchema = z.object({
  isActive: z.boolean().optional(),
  title: z.string().max(200).optional(),
  times: z.array(z.unknown()).min(1).max(MAX_TIMES).optional(),
  durationDays: z.number().int().min(1).max(3650).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

/**
 * PATCH /api/v2/intake/[planId] — изменить курс:
 * `{ isActive?, title?, times?, durationDays?, note? }`.
 *
 * Раньше принималось только `{ isActive }`, из-за чего переименование курса или
 * смена времени приёма были возможны лишь через удаление плана — а оно каскадом
 * стирает всю историю отметок.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const { planId } = await params;
    // Чужой план неотличим от несуществующего: 404, а не 403.
    const own = await findOwnPlan(planId, session.sub);
    if (!own) return planNotFound();

    const day = resolveDay(new URL(req.url));
    if (!day.ok) return day.res;

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }
    const input = parsed.data;

    const data: {
      isActive?: boolean;
      title?: string;
      times?: string[];
      durationDays?: number | null;
      note?: string | null;
    } = {};

    if (input.isActive !== undefined) data.isActive = input.isActive;

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) return apiError("Название курса не может быть пустым", 400, "VALIDATION");
      data.title = title;
    }

    if (input.times !== undefined) {
      const times = normalizeTimes(input.times);
      if (!times) {
        return apiError(
          `Некорректное время приёма: ожидается формат ЧЧ:ММ, от 1 до ${MAX_TIMES} значений`,
          400,
          "VALIDATION",
        );
      }
      data.times = times;
    }

    if (input.durationDays !== undefined) data.durationDays = input.durationDays;
    if (input.note !== undefined) data.note = input.note?.trim() || null;

    if (Object.keys(data).length === 0) {
      return apiError("Нет полей для изменения", 400, "VALIDATION");
    }

    const updated = await mutateLegacyPlan(session.sub, own.id, data);
    if (!updated) return planNotFound();
    const logs = await prisma.intakeLog.findMany({ where: { planId: own.id, day: day.value, taken: true } });

    return apiOk(serializeIntakePlan({ ...updated, logs }), { headers: { "X-Intake-Day": day.value } });
  } catch (e) {
    if (e instanceof TrackerError) return apiError(e.message, e.status, e.code);
    return apiInternal("api/v2/intake/[planId]", e);
  }
}

/** DELETE /api/v2/intake/[planId] — удалить курс вместе с историей (cascade). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const { planId } = await params;
    const own = await findOwnPlan(planId, session.sub);
    if (!own) return planNotFound();

    await mutateLegacyPlan(session.sub, own.id, "delete");
    return apiOk({ ok: true });
  } catch (e) {
    if (e instanceof TrackerError) return apiError(e.message, e.status, e.code);
    return apiInternal("api/v2/intake/[planId]", e);
  }
}
