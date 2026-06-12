"use server";

import { redirect } from "next/navigation";
import { loginWholesale, registerWholesale } from "@/lib/b2b-auth";
import { rateLimit, rateLimitRetryAfter } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/utils";

/**
 * Server actions входа/регистрации оптовых партнёров.
 * Вся бизнес-логика — в src/lib/b2b-auth.ts; здесь валидация формы,
 * rate limit по телефону и маршрутизация по статусу аккаунта.
 */

export type B2BFormState = { error?: string };

const WINDOW_MS = 15 * 60 * 1000;

function tooManyAttempts(key: string, limit: number): string | null {
  if (rateLimit(key, limit, WINDOW_MS)) return null;
  const minutes = Math.max(1, Math.ceil(rateLimitRetryAfter(key, WINDOW_MS) / 60));
  return `Слишком много попыток. Попробуйте снова через ${minutes} мин.`;
}

export async function registerAction(
  _prev: B2BFormState,
  formData: FormData,
): Promise<B2BFormState> {
  const name = String(formData.get("name") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  const inn = String(formData.get("inn") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const comment = String(formData.get("comment") || "").trim();
  const consent = formData.get("consent");

  if (!name) return { error: "Укажите контактное лицо" };
  if (!phone) return { error: "Укажите телефон" };
  if (!password) return { error: "Придумайте пароль" };
  if (!consent) {
    return { error: "Для отправки заявки нужно согласие на обработку персональных данных" };
  }

  // 5 заявок за 15 минут на один телефон — защита от перебора и спама
  const limited = tooManyAttempts(`b2b-register:${normalizePhone(phone)}`, 5);
  if (limited) return { error: limited };

  const result = await registerWholesale({
    name,
    // Частники закупают без юрлица: компания опциональна
    company: company || name,
    phone,
    password,
    inn: inn || undefined,
    city: city || undefined,
    comment: comment || undefined,
  });
  if (!result.ok) return { error: result.error };

  // Сессия создана, аккаунт в статусе PENDING — на статусный экран
  redirect("/opt/pending");
}

export async function loginAction(
  _prev: B2BFormState,
  formData: FormData,
): Promise<B2BFormState> {
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  if (!phone || !password) return { error: "Введите телефон и пароль" };

  const limited = tooManyAttempts(`b2b-login:${normalizePhone(phone)}`, 10);
  if (limited) return { error: limited };

  const result = await loginWholesale(phone, password);
  if (!result.ok) return { error: result.error };

  redirect(result.status === "APPROVED" ? "/opt/price" : "/opt/pending");
}
