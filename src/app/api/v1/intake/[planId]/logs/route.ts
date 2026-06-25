import { z } from "zod";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { requireApiCustomer, ApiAuthError } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** Проверка владения планом. Возвращает null, если доступ есть; иначе — ответ-ошибку. */
async function ensureOwnership(planId: string, customerId: string) {
  const plan = await prisma.intakePlan.findUnique({
    where: { id: planId },
    select: { customerId: true },
  });
  if (!plan) return apiError("План не найден", 404, "NOT_FOUND");
  if (plan.customerId !== customerId) return apiError("Доступ запрещён", 403, "FORBIDDEN");
  return null;
}

const postSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.string().min(1),
});

/** POST /api/v1/intake/[planId]/logs — переключить отметку приёма (toggle). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await requireApiCustomer(req);
    const { planId } = await params;

    const denied = await ensureOwnership(planId, session.sub);
    if (denied) return denied;

    const body = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }
    const { day, slot } = parsed.data;

    const existing = await prisma.intakeLog.findUnique({
      where: { planId_day_slot: { planId, day, slot } },
    });

    if (existing) {
      await prisma.intakeLog.delete({ where: { id: existing.id } });
      return apiOk({ taken: false, day, slot });
    }

    await prisma.intakeLog.create({ data: { planId, day, slot } });
    return apiOk({ taken: true, day, slot });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}

/** GET /api/v1/intake/[planId]/logs — логи приёма за период (query from,to). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await requireApiCustomer(req);
    const { planId } = await params;

    const denied = await ensureOwnership(planId, session.sub);
    if (denied) return denied;

    const url = new URL(req.url);
    const from = url.searchParams.get("from") || undefined;
    const to = url.searchParams.get("to") || undefined;

    const logs = await prisma.intakeLog.findMany({
      where: {
        planId,
        ...(from || to
          ? { day: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      orderBy: [{ day: "asc" }, { slot: "asc" }],
    });

    return apiOk(logs.map((l) => ({ day: l.day, slot: l.slot, takenAt: l.takenAt })));
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
