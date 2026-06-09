import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";

const COOKIE_NAME = "hayat_customer";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error("AUTH_SECRET не задан.");
  return new TextEncoder().encode(secret);
}

export interface CustomerSession {
  sub: string;
  phone: string;
  name: string;
}

async function createCustomerSession(payload: CustomerSession): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroyCustomerSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { sub: payload.sub as string, phone: payload.phone as string, name: payload.name as string };
  } catch {
    return null;
  }
}

export async function requireCustomer(): Promise<CustomerSession> {
  const s = await getCustomerSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function registerCustomer(input: {
  name: string;
  phone: string;
  password: string;
  email?: string;
}): Promise<AuthResult> {
  const phone = normalizePhone(input.phone);
  if (phone.replace(/\D/g, "").length < 11) return { ok: false, error: "Некорректный номер телефона" };
  if (input.password.length < 6) return { ok: false, error: "Пароль не короче 6 символов" };

  const exists = await prisma.customer.findUnique({ where: { phone } });
  if (exists) return { ok: false, error: "Пользователь с таким телефоном уже зарегистрирован" };

  const customer = await prisma.customer.create({
    data: {
      phone,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      passwordHash: await bcrypt.hash(input.password, 12),
    },
  });
  await createCustomerSession({ sub: customer.id, phone: customer.phone, name: customer.name });
  return { ok: true };
}

export async function loginCustomer(phoneRaw: string, password: string): Promise<AuthResult> {
  const phone = normalizePhone(phoneRaw);
  const customer = await prisma.customer.findUnique({ where: { phone } });
  // deletedAt — аккаунт удалён по запросу покупателя (152-ФЗ), вход запрещён.
  if (!customer || !customer.isActive || customer.deletedAt) {
    return { ok: false, error: "Неверный телефон или пароль" };
  }
  const ok = await bcrypt.compare(password, customer.passwordHash);
  if (!ok) return { ok: false, error: "Неверный телефон или пароль" };

  await prisma.customer.update({ where: { id: customer.id }, data: { lastLoginAt: new Date() } });
  await createCustomerSession({ sub: customer.id, phone: customer.phone, name: customer.name });
  return { ok: true };
}
