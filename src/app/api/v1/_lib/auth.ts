// JWT Bearer-аутентификация для мобильного клиента (API v1).
//
// Токен подписывается тем же AUTH_SECRET (HS256, jose), payload совместим
// с customer-сессией сайта: { sub, phone, name } — см. src/lib/customer-auth.ts.
// Логика выдачи/проверки продублирована здесь, т.к. customer-auth.ts работает
// только с httpOnly-cookie и недоступен для изменения.

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";

/** Срок жизни токена — 30 дней (как у cookie-сессии сайта). */
export const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error("AUTH_SECRET не задан.");
  return new TextEncoder().encode(secret);
}

/** Payload токена — совместим с CustomerSession из src/lib/customer-auth.ts. */
export interface ApiCustomerSession {
  sub: string;
  phone: string;
  name: string;
}

/** Подписывает JWT для мобильного клиента. */
export async function issueCustomerToken(payload: ApiCustomerSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Проверяет заголовок `Authorization: Bearer <jwt>`.
 * Возвращает payload или null (нет заголовка / токен невалиден / истёк).
 */
export async function verifyBearer(req: Request): Promise<ApiCustomerSession | null> {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      phone: String(payload.phone ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

/**
 * Проверяет Bearer и убеждается, что аккаунт существует, активен и не удалён.
 * Возвращает запись Customer или null.
 */
export async function requireActiveCustomer(req: Request) {
  const session = await verifyBearer(req);
  if (!session) return null;
  const customer = await prisma.customer.findUnique({ where: { id: session.sub } });
  if (!customer || !customer.isActive || customer.deletedAt) return null;
  return customer;
}

/** IP клиента для rate limiting (за обратным прокси). */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export type ApiAuthResult =
  | { ok: true; token: string; customer: PublicCustomer }
  | { ok: false; code: "VALIDATION_ERROR" | "PHONE_TAKEN" | "INVALID_CREDENTIALS"; message: string };

export interface PublicCustomer {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  city: string | null;
  createdAt: string;
}

export function toPublicCustomer(c: {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  city: string | null;
  createdAt: Date;
}): PublicCustomer {
  return {
    id: c.id,
    phone: c.phone,
    name: c.name,
    email: c.email,
    city: c.city,
    createdAt: c.createdAt.toISOString(),
  };
}

/** Регистрация: телефон + пароль (нормализация телефона как на сайте). */
export async function registerCustomerApi(input: {
  name: string;
  phone: string;
  password: string;
  email?: string;
}): Promise<ApiAuthResult> {
  const phone = normalizePhone(input.phone);
  if (phone.replace(/\D/g, "").length < 11) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Некорректный номер телефона" };
  }
  if (input.password.length < 6) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Пароль не короче 6 символов" };
  }

  const exists = await prisma.customer.findUnique({ where: { phone } });
  if (exists) {
    return {
      ok: false,
      code: "PHONE_TAKEN",
      message: "Пользователь с таким телефоном уже зарегистрирован",
    };
  }

  const customer = await prisma.customer.create({
    data: {
      phone,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      passwordHash: await bcrypt.hash(input.password, 12),
    },
  });

  const token = await issueCustomerToken({
    sub: customer.id,
    phone: customer.phone,
    name: customer.name,
  });
  return { ok: true, token, customer: toPublicCustomer(customer) };
}

/** Вход: телефон + пароль. Удалённым (deletedAt) и заблокированным (isActive=false) вход запрещён. */
export async function loginCustomerApi(phoneRaw: string, password: string): Promise<ApiAuthResult> {
  const phone = normalizePhone(phoneRaw);
  const customer = await prisma.customer.findUnique({ where: { phone } });
  // Не раскрываем причину отказа (не найден / заблокирован / удалён).
  if (!customer || !customer.isActive || customer.deletedAt) {
    return { ok: false, code: "INVALID_CREDENTIALS", message: "Неверный телефон или пароль" };
  }
  const valid = await bcrypt.compare(password, customer.passwordHash);
  if (!valid) {
    return { ok: false, code: "INVALID_CREDENTIALS", message: "Неверный телефон или пароль" };
  }

  await prisma.customer.update({ where: { id: customer.id }, data: { lastLoginAt: new Date() } });

  const token = await issueCustomerToken({
    sub: customer.id,
    phone: customer.phone,
    name: customer.name,
  });
  return { ok: true, token, customer: toPublicCustomer(customer) };
}
