import { z } from "zod";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { requireApiCustomer, ApiAuthError } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeIntakePlan } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

const patchSchema = z.object({
  isActive: z.boolean(),
});

/** PATCH /api/v1/intake/[planId] — изменить активность плана. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await requireApiCustomer(req);
    const { planId } = await params;

    const plan = await prisma.intakePlan.findUnique({ where: { id: planId }, select: { customerId: true } });
    if (!plan) {
      return apiError("План не найден", 404, "NOT_FOUND");
    }
    if (plan.customerId !== session.sub) {
      return apiError("Доступ запрещён", 403, "FORBIDDEN");
    }

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    const updated = await prisma.intakePlan.update({
      where: { id: planId },
      data: { isActive: parsed.data.isActive },
      include: { logs: { where: { day: new Date().toISOString().slice(0, 10) } } },
    });

    return apiOk(serializeIntakePlan(updated));
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}

/** DELETE /api/v1/intake/[planId] — удалить план приёма. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await requireApiCustomer(req);
    const { planId } = await params;

    const plan = await prisma.intakePlan.findUnique({ where: { id: planId }, select: { customerId: true } });
    if (!plan) {
      return apiError("План не найден", 404, "NOT_FOUND");
    }
    if (plan.customerId !== session.sub) {
      return apiError("Доступ запрещён", 403, "FORBIDDEN");
    }

    await prisma.intakePlan.delete({ where: { id: planId } });
    return apiOk({ ok: true });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
