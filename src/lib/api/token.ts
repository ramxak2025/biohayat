import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { CustomerSession } from "@/lib/customer-auth";

/**
 * Токены для REST API (React Native и внешние клиенты).
 * Используется тот же секрет и формат claim'ов, что и у cookie-сессии покупателя,
 * поэтому Bearer-токен и cookie взаимозаменяемы.
 */


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
  let sub: string;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    sub = payload.sub;
  } catch { return null; }
  const customer = await prisma.customer.findUnique({ where: { id: sub } });
  if (!customer || !customer.isActive || customer.deletedAt) return null;
  return { sub: customer.id, phone: customer.phone, name: customer.name };
}

/** Native API uses explicit Bearer authentication; cookie sessions belong to website actions. */
export async function getApiCustomer(req: Request): Promise<CustomerSession | null> {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.get("authorization") || "");
  return match ? verify(match[1]) : null;
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
