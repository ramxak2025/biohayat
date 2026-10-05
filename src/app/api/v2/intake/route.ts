import { z } from "zod";
import { apiOk, apiError, apiPreflight, apiInternal } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeIntakePlan } from "@/lib/api/serializers";
import { MAX_TIMES, normalizeTimes, resolveDay } from "./_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/**
 * GET /api/v2/intake — курсы приёма покупателя с отметками за «сегодня».
 *
 * «Сегодня» берётся из `?day=YYYY-MM-DD` (предпочтительно: клиент знает свою
 * локальную дату) либо из `?tz=Europe/Moscow`. Без параметров — UTC сервера,
 * как было раньше (сайт не ломается).
 */
export async function GET(req: Request) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const day = resolveDay(new URL(req.url));
    if (!day.ok) return day.res;

    const plans = await prisma.intakePlan.findMany({
      where: { customerId: session.sub },
      orderBy: { createdAt: "desc" },
      include: { logs: { where: { day: day.value } } },
    });

    return apiOk(plans.map(serializeIntakePlan), { headers: { "X-Intake-Day": day.value } });
  } catch (e) {
    return apiInternal("api/v2/intake", e);
  }
}

const schema = z.object({
  productId: z.string().optional(),
  title: z.string().max(200).optional(),
  times: z.array(z.unknown()).min(1).max(MAX_TIMES),
  durationDays: z.number().int().min(1).max(3650).nullish(),
  note: z.string().max(1000).nullish(),
});

/** POST /api/v2/intake — создать курс приёма. */
export async function POST(req: Request) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const day = resolveDay(new URL(req.url));
    if (!day.ok) return day.res;

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }
    const data = parsed.data;

    // Времена приёма валидируются строго: приложение планирует по ним локальные
    // уведомления, поэтому «9:00» или «morning» дальше пускать нельзя.
    const times = normalizeTimes(data.times);
    if (!times) {
      return apiError(
        `Некорректное время приёма: ожидается формат ЧЧ:ММ, от 1 до ${MAX_TIMES} значений`,
        400,
        "VALIDATION",
      );
    }

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
      return apiError("Укажите название курса или выберите товар", 400, "VALIDATION");
    }

    const plan = await prisma.intakePlan.create({
      data: {
        customerId: session.sub,
        productId,
        title,
        times,
        durationDays: data.durationDays ?? null,
        note: data.note?.trim() || null,
      },
      include: { logs: { where: { day: day.value } } },
    });

    return apiOk(serializeIntakePlan(plan), {
      status: 201,
      headers: { "X-Intake-Day": day.value },
    });
  } catch (e) {
    return apiInternal("api/v2/intake", e);
  }
}
