import { z } from "zod";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { requireApiCustomer, ApiAuthError } from "@/lib/api/token";
import { serializeCustomer } from "@/lib/api/customer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/auth/me — профиль текущего покупателя. */
export async function GET(req: Request) {
  try {
    const session = await requireApiCustomer(req);
    const customer = await prisma.customer.findUnique({ where: { id: session.sub } });
    if (!customer) {
      return apiError("Покупатель не найден", 404, "NOT_FOUND");
    }
    return apiOk(serializeCustomer(customer));
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
});

/** PATCH /api/v1/auth/me — обновление профиля. */
export async function PATCH(req: Request) {
  try {
    const session = await requireApiCustomer(req);
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    const data: { name?: string; email?: string | null; city?: string | null } = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.email !== undefined) data.email = parsed.data.email || null;
    if (parsed.data.city !== undefined) data.city = parsed.data.city || null;

    const customer = await prisma.customer.update({
      where: { id: session.sub },
      data,
    });
    return apiOk(serializeCustomer(customer));
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
