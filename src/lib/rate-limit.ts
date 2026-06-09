// Простой in-memory rate limiter (sliding window) для server actions и API routes.
// Достаточен для одного процесса Next.js; при горизонтальном масштабировании
// заменить на Redis-based (интерфейс сохранить).

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

// Периодическая уборка, чтобы Map не рос бесконечно
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

/**
 * Проверяет лимит: не более `limit` событий за окно `windowMs` для ключа `key`.
 * Возвращает true, если действие разрешено (и регистрирует попытку).
 *
 * Пример: rateLimit(`login:${phone}`, 5, 15 * 60 * 1000)
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  cleanup(windowMs);
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return true;
}

/** Сколько секунд осталось до освобождения окна (для сообщения пользователю). */
export function rateLimitRetryAfter(key: string, windowMs: number): number {
  const bucket = buckets.get(key);
  if (!bucket || bucket.timestamps.length === 0) return 0;
  const oldest = Math.min(...bucket.timestamps);
  return Math.max(0, Math.ceil((oldest + windowMs - Date.now()) / 1000));
}
