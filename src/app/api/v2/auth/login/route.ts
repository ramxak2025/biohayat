import { z } from "zod";
import { apiOk, apiError, apiPreflight, apiInternal } from "@/lib/api/response";
import { apiLogin, serializeCustomer } from "@/lib/api/customer";
import { clientIp } from "@/lib/api/rate-limit";
import { normalizePhone } from "@/lib/utils";
import { throttle, release } from "../_lib/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

const schema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

/**
 * POST /api/v2/auth/login — вход по телефону и паролю, возвращает Bearer-токен.
 *
 * Лимит: 5 попыток / 15 мин, отдельно по IP и по телефону. Каждая попытка —
 * это bcrypt(12), ~250 мс CPU, так что перебор бьёт и по безопасности,
 * и по доступности.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    const phone = normalizePhone(parsed.data.phone);
    const limit = throttle("login", [`ip:${clientIp(req)}`, `phone:${phone}`]);
    if (limit.limited) return limit.limited;

    const result = await apiLogin(parsed.data.phone, parsed.data.password);
    if (!result.ok) {
      return apiError(result.error, result.status);
    }

    release(limit.keys);

    return apiOk({
      token: result.token,
      expiresInSec: result.expiresInSec,
      customer: serializeCustomer(result.customer),
    });
  } catch (e) {
    return apiInternal("api/v2/auth/login", e);
  }
}
