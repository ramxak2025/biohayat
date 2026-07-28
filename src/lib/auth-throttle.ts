import "server-only";
import { headers } from "next/headers";
import { rateLimit, rateLimitRetryAfter } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/utils";

/**
 * Ограничение попыток входа и регистрации по телефону и IP.
 * Вынесено из серверных экшенов: теперь этим пользуются обработчики форм
 * /account/login и /account/register.
 */

const AUTH_LIMIT = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 минут

/** IP клиента для rate limiting (за обратным прокси). */
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Проверяет лимит попыток. Возвращает число минут до следующей попытки,
 * если лимит исчерпан, иначе null.
 */
export async function authRateLimited(
  action: "login" | "register",
  phone: string,
): Promise<number | null> {
  const ip = await clientIp();
  const phoneKey = `${action}:${normalizePhone(phone)}`;
  const ipKey = `${action}-ip:${ip}`;
  // Обе попытки регистрируем всегда (без короткого замыкания).
  const phoneOk = rateLimit(phoneKey, AUTH_LIMIT, AUTH_WINDOW_MS);
  const ipOk = rateLimit(ipKey, AUTH_LIMIT, AUTH_WINDOW_MS);
  if (phoneOk && ipOk) return null;
  const retrySec = Math.max(
    rateLimitRetryAfter(phoneKey, AUTH_WINDOW_MS),
    rateLimitRetryAfter(ipKey, AUTH_WINDOW_MS),
  );
  return Math.max(1, Math.ceil(retrySec / 60));
}
