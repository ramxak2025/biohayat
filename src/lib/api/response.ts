import { NextResponse } from "next/server";

/**
 * Утилиты ответов REST API v1.
 * Единый конверт: { data } при успехе, { error: { message, code? } } при ошибке.
 * CORS открыт для будущего мобильного приложения (React Native) и внешних клиентов.
 */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function apiOk<T>(data: T, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(
    { data },
    { status: init?.status ?? 200, headers: { ...corsHeaders, ...(init?.headers || {}) } },
  );
}

export function apiError(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { error: { message, code } },
    { status, headers: corsHeaders },
  );
}

/**
 * Ответ на непредвиденную ошибку: клиенту — обезличенное сообщение, в логи
 * сервера — настоящая причина.
 *
 * Раньше роуты писали `} catch { return apiError("Внутренняя ошибка", 500) }`,
 * то есть теряли исключение целиком: в `docker compose logs app` не оставалось
 * ничего, и понять причину 500 было невозможно. Настоящий текст ошибки может
 * содержать детали запросов к БД, поэтому наружу он по-прежнему не уходит.
 *
 * Пишем через console.error — единственный вызов console, который остаётся
 * в прод-сборке (см. compiler.removeConsole в next.config.ts).
 */
export function apiInternal(where: string, e: unknown) {
  console.error(`[api] ${where}:`, e);
  return apiError("Внутренняя ошибка", 500, "INTERNAL");
}

/** Обработчик preflight-запросов CORS. */
export function apiPreflight() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** Стандартная пагинация из query-параметров. */
export function parsePaging(url: URL, defTake = 24, maxTake = 100) {
  const take = Math.min(maxTake, Math.max(1, Number(url.searchParams.get("take")) || defTake));
  const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
  return { take, skip };
}
