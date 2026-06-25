import { z } from "zod";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { apiLogin, serializeCustomer } from "@/lib/api/customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

const schema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

/** POST /api/v1/auth/login — вход по телефону и паролю, возвращает Bearer-токен. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    const result = await apiLogin(parsed.data.phone, parsed.data.password);
    if (!result.ok) {
      return apiError(result.error, result.status);
    }

    return apiOk({
      token: result.token,
      expiresInSec: result.expiresInSec,
      customer: serializeCustomer(result.customer),
    });
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
