import "server-only";

/**
 * Лимитер запросов в памяти процесса.
 *
 * Зачем: `/auth/login` считает bcrypt(12) — это ~250 мс CPU на попытку, то есть
 * перебор пароля бьёт и по безопасности, и по доступности сервиса. Публичное
 * мобильное приложение выпускать без этого нельзя.
 *
 * Ограничение осознанное: счётчики живут в памяти одного контейнера и сбрасываются
 * при рестарте. Для одного инстанса (текущий docker-compose) этого достаточно;
 * при горизонтальном масштабировании нужно вынести в Redis — точка расширения
 * одна, функция `hit`.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
/** Чтобы карта не росла бесконечно от случайных ключей. */
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  /** Сколько попыток осталось в текущем окне. */
  remaining: number;
  /** Через сколько секунд окно откроется (для заголовка Retry-After). */
  retryAfterSec: number;
}

export function hit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSec: windowSec };
  }

  existing.count += 1;
  const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec,
  };
}

/** Сбросить счётчик — вызывать после успешного входа, чтобы не наказывать живого пользователя. */
export function reset(key: string): void {
  buckets.delete(key);
}

/**
 * IP клиента. За Caddy/Nginx реальный адрес приходит в X-Forwarded-For;
 * заголовку доверяем только потому, что наружу порт приложения не смотрит.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Готовый ключ вида "login:1.2.3.4:+79990000000". */
export function key(scope: string, ...parts: (string | undefined)[]): string {
  return [scope, ...parts.filter(Boolean)].join(":");
}
