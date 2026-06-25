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

/** Сегодняшняя дата в формате YYYY-MM-DD. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** GET /api/v1/intake — планы приёма покупателя с логами за сегодня. */
export async function GET(req: Request) {
  try {
    const session = await requireApiCustomer(req);
    const plans = await prisma.intakePlan.findMany({
      where: { customerId: session.sub },
      orderBy: { createdAt: "desc" },
      include: { logs: { where: { day: today() } } },
    });
    return apiOk(plans.map(serializeIntakePlan));
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}

const schema = z.object({
  productId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  times: z.array(z.string()).min(1),
  durationDays: z.number().int().min(1).max(3650).optional(),
  note: z.string().max(1000).optional(),
});

/** POST /api/v1/intake — создать план приёма. */
export async function POST(req: Request) {
  try {
    const session = await requireApiCustomer(req);
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }
    const data = parsed.data;

    let title = data.title?.trim();
    let productId: string | null = null;

    if (data.productId) {
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
        select: { id: true, name: true },
      });
      if (product) {
        productId = product.id;
        if (!title) title = product.name;
      }
    }

    if (!title) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    const plan = await prisma.intakePlan.create({
      data: {
        customerId: session.sub,
        productId,
        title,
        times: data.times,
        durationDays: data.durationDays ?? null,
        note: data.note ?? null,
      },
      include: { logs: { where: { day: today() } } },
    });

    return apiOk(serializeIntakePlan(plan), { status: 201 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
