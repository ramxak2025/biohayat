import { sessionGeneration } from "@/lib/session-generation";
import type { ApiErrorCode, ApiFailure, ApiSuccess } from "./types";
import { API_BASE, API_ORIGIN, REQUEST_TIMEOUT_MS } from "./config";

export class ApiError extends Error {
  /** Совместимость с обработчиками старого клиента; v2 не подменяет ошибки 404. */
  legacyGap = false;

  constructor(
    readonly status: number,
    message: string,
    readonly code?: ApiErrorCode,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Протухший/битый токен: сервер отдаёт 401 с code=UNAUTHORIZED.
   * 401 БЕЗ code — это неверный логин/пароль, сессию трогать нельзя.
   */
  get isAuthExpired() {
    return this.status === 401 && this.code === "UNAUTHORIZED";
  }

  get isNetwork() {
    return this.status === 0;
  }
}

/** Вызывается клиентом при протухшей сессии (ставится из стора авторизации). */
let onAuthExpired: ((token: string) => void) | null = null;
export function setAuthExpiredHandler(fn: ((token: string) => void) | null) {
  onAuthExpired = fn;
}

/** Текущий токен берём лениво, чтобы не тащить стор в сетевой слой. */
let tokenGetter: () => string | null = () => null;
export function setTokenGetter(fn: () => string | null) {
  tokenGetter = fn;
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** По умолчанию токен подставляется сам, если он есть. */
  auth?: boolean;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, auth = true, headers, signal, ...rest } = options;
  const token = auth ? tokenGetter() : null;
  const epoch = sessionGeneration();
  const assertCurrent = () => {
    if (auth && (epoch !== sessionGeneration() || token !== tokenGetter())) throw new ApiError(409, "Сессия изменилась. Повторите действие.", "SESSION_CHANGED");
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // внешний abort (уход с экрана) должен гасить и наш таймер
  const onExternalAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", onExternalAbort);

  let res: Response;
  let text: string;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    text = await res.text();
    assertCurrent();
  } catch (e) {
    assertCurrent();
    if (e instanceof ApiError) throw e;
    const aborted = (e as Error)?.name === "AbortError";
    throw new ApiError(0, aborted ? "Превышено время ожидания" : "Нет соединения с сервером");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onExternalAbort);
  }

  let json: unknown = null;
  let parsed = true;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Не бросаем сразу: 404 от Next.js приходит HTML-страницей, и разбор JSON
      // не должен опережать проверку статуса — иначе ошибка теряет признак
      // «такого маршрута нет на сервере» и раздел показывает панику вместо тишины.
      parsed = false;
    }
  }

  if (!res.ok) {
    const err = (json as ApiFailure | null)?.error;
    const apiError = new ApiError(
      res.status,
      err?.message ?? "Ошибка сервера",
      err?.code,
    );
    if (apiError.isAuthExpired && token) onAuthExpired?.(token);
    throw apiError;
  }

  if (!parsed) throw new ApiError(res.status, "Сервер вернул не JSON");

  // Старая сборка отвечает {ok:true,data}, текущая — {data}. Обе разворачиваем одинаково.
  const envelope = json as ApiSuccess<T> | null;
  if (!envelope || !Object.prototype.hasOwnProperty.call(envelope, "data")) throw new ApiError(502, "Сервер вернул некорректные данные");
  return envelope.data;
}

/**
 * Относительные изображения принадлежат серверу API. Абсолютные HTTP(S)-ссылки
 * сохраняют свой origin: изображение может храниться на внешнем CDN.
 */
export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, `${API_ORIGIN}/`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Query-строка без пустых значений. */
export function qs(params: object): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
