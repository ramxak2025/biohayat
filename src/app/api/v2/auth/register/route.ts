import { z } from "zod";
import { apiOk, apiError, apiPreflight, apiInternal } from "@/lib/api/response";
import { apiRegister, serializeCustomer } from "@/lib/api/customer";
import { clientIp } from "@/lib/api/rate-limit";
import { normalizePhone } from "@/lib/utils";
import { throttle } from "../_lib/throttle";

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

/**
 * POST /api/v2/auth/register — регистрация покупателя, возвращает Bearer-токен.
 *
 * Лимит тот же, что и на входе: 5 / 15 мин по IP и по телефону. Счётчик после
 * успешной регистрации намеренно НЕ сбрасывается — массовое создание аккаунтов
 * с одного адреса нам не нужно, а живому человеку одной попытки достаточно.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    const phone = normalizePhone(parsed.data.phone);
    const limit = throttle("register", [`ip:${clientIp(req)}`, `phone:${phone}`]);
    if (limit.limited) return limit.limited;

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
  } catch (e) {
    return apiInternal("api/v2/auth/register", e);
  }
}
