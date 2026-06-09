// Единый формат ответа публичного API v1.
// Успех:  { ok: true, data, meta? }
// Ошибка: { ok: false, error: { code, message } }

import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PHONE_TAKEN"
  | "INVALID_CREDENTIALS"
  | "PRODUCT_NOT_FOUND"
  | "INTERNAL_ERROR";

export function apiOk<T>(data: T, meta?: Record<string, unknown>, init?: ResponseInit): NextResponse {
  return NextResponse.json(
    meta === undefined ? { ok: true, data } : { ok: true, data, meta },
    init,
  );
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  headers?: Record<string, string>,
): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers });
}

/** Первое сообщение из ZodError — человекочитаемая ошибка валидации. */
export function zodMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Некорректные данные запроса";
  const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

/** Обёртка обработчика: ловит непредвиденные ошибки → 500 в едином формате. */
export function withErrorHandling<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>,
): (...args: A) => Promise<NextResponse> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[api/v1]", err);
      return apiError(500, "INTERNAL_ERROR", "Внутренняя ошибка сервера");
    }
  };
}
