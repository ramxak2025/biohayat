import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { hit, key, reset } from "@/lib/api/rate-limit";

/**
 * Ограничение попыток на /auth/*.
 *
 * Пять попыток на 15 минут — и всегда по нескольким вёдрам сразу: атакующий,
 * который перебирает телефоны с одного IP, и тот, кто перебирает IP по одному
 * телефону, должны ловиться оба. Поэтому hit() вызывается для каждого ведра
 * без короткого замыкания: иначе второе ведро не считалось бы, пока первое
 * не переполнено.
 */

const LIMIT = 5;
const WINDOW_SEC = 15 * 60;

export interface ThrottleResult {
  /** Ключи задетых вёдер — отдать в release() после успешного входа. */
  keys: string[];
  /** Готовый 429, если лимит исчерпан хотя бы по одному ведру; иначе null. */
  limited: NextResponse | null;
}

/**
 * @param scope — область лимита, напр. "login".
 * @param ids — хвосты ключей, по ведру на каждый идентификатор,
 *   напр. ["ip:1.2.3.4", "phone:+79990000000"].
 */
export function throttle(
  scope: string,
  ids: string[],
  limit = LIMIT,
  windowSec = WINDOW_SEC,
): ThrottleResult {
  const keys = ids.map((id) => key(scope, id));
  const results = keys.map((k) => hit(k, limit, windowSec));
  const exceeded = results.filter((r) => !r.ok);
  if (exceeded.length === 0) return { keys, limited: null };

  const retryAfterSec = Math.max(...exceeded.map((r) => r.retryAfterSec));
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  // apiError не умеет отдавать доп. заголовки, а Retry-After клиенту нужен,
  // чтобы показать таймер вместо «попробуйте позже».
  const res = apiError(
    `Слишком много попыток. Повторите через ${minutes} мин.`,
    429,
  );
  res.headers.set("Retry-After", String(retryAfterSec));
  return { keys, limited: res };
}

/** Сбросить счётчики после успеха — живого пользователя наказывать не за что. */
export function release(keys: string[]): void {
  for (const k of keys) reset(k);
}
