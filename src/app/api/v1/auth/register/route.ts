// POST /api/v1/auth/register — регистрация покупателя (телефон + пароль).
// Rate limit: 5 попыток за 15 минут на связку телефон+IP.

import { type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit, rateLimitRetryAfter } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/utils";
import { apiOk, apiError, zodMessage, withErrorHandling } from "../../_lib/response";
import { registerCustomerApi, getClientIp } from "../../_lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

const bodySchema = z.object({
  name: z.string().min(2, "Укажите имя").max(120),
  phone: z.string().min(10, "Укажите корректный телефон").max(30),
  password: z.string().min(6, "Пароль не короче 6 символов").max(200),
  email: z.string().email("Некорректный e-mail").optional().or(z.literal("")),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", zodMessage(parsed.error));

  const phone = normalizePhone(parsed.data.phone);
  const key = `v1:register:${phone}:${getClientIp(req)}`;
  if (!rateLimit(key, RATE_LIMIT, RATE_WINDOW_MS)) {
    const retryAfter = rateLimitRetryAfter(key, RATE_WINDOW_MS);
    return apiError(429, "RATE_LIMITED", "Слишком много попыток. Повторите позже.", {
      "Retry-After": String(retryAfter),
    });
  }

  const result = await registerCustomerApi({
    name: parsed.data.name,
    phone: parsed.data.phone,
    password: parsed.data.password,
    email: parsed.data.email || undefined,
  });
  if (!result.ok) {
    const status = result.code === "PHONE_TAKEN" ? 409 : 400;
    return apiError(status, result.code, result.message);
  }

  return apiOk({ token: result.token, customer: result.customer }, undefined, { status: 201 });
});
