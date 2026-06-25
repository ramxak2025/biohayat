import { z } from "zod";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { apiRegister, serializeCustomer } from "@/lib/api/customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(1),
  password: z.string().min(6),
  email: z.string().email().optional(),
  consent: z.literal(true),
});

/** POST /api/v1/auth/register — регистрация покупателя, возвращает Bearer-токен. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    const result = await apiRegister({
      name: parsed.data.name,
      phone: parsed.data.phone,
      password: parsed.data.password,
      email: parsed.data.email,
    });

    if (!result.ok) {
      return apiError(result.error, result.status);
    }

    return apiOk(
      {
        token: result.token,
        expiresInSec: result.expiresInSec,
        customer: serializeCustomer(result.customer),
      },
      { status: 201 },
    );
  } catch {
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
