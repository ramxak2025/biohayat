import { SignJWT, jwtVerify } from "jose";
import type { CustomerSession } from "@/lib/customer-auth";

/**
 * Токены для REST API (React Native и внешние клиенты).
 * Используется тот же секрет и формат claim'ов, что и у cookie-сессии покупателя,
 * поэтому Bearer-токен и cookie взаимозаменяемы.
 */

const COOKIE_NAME = "hayat_customer";
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET не задан.");
  return new TextEncoder().encode(s);
}

export async function signCustomerToken(
  payload: CustomerSession,
  maxAgeSec = DEFAULT_MAX_AGE,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secret());
}

async function verify(token: string): Promise<CustomerSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      sub: payload.sub as string,
      phone: payload.phone as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

function cookieFromHeader(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/**
 * Определяет покупателя по запросу: сначала заголовок Authorization: Bearer,
 * затем cookie сессии. Возвращает CustomerSession или null.
 */
export async function getApiCustomer(req: Request): Promise<CustomerSession | null> {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return verify(auth.slice(7).trim());
  }
  const cookie = cookieFromHeader(req, COOKIE_NAME);
  if (cookie) return verify(cookie);
  return null;
}

/** Бросает 401-совместимую ошибку, если нет авторизации. */
export async function requireApiCustomer(req: Request): Promise<CustomerSession> {
  const c = await getApiCustomer(req);
  if (!c) throw new ApiAuthError();
  return c;
}

export class ApiAuthError extends Error {
  constructor() {
    super("Требуется авторизация");
    this.name = "ApiAuthError";
  }
}
