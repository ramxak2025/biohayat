import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cookieSecure } from "@/lib/cookie-secure";
import { normalizePhone } from "@/lib/utils";
import type { WholesaleStatus } from "@prisma/client";

/**
 * Сессии оптовых аккаунтов (opt.biohayat.ru). Полностью независимы от
 * розничных: свой cookie, свой кабинет, доступ к ценам — после одобрения
 * менеджером (status APPROVED, проверяется по БД на каждом запросе).
 */

const COOKIE_NAME = "hayat_b2b";
const MAX_AGE = 60 * 60 * 24 * 30;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface B2BSession {
  sub: string;
  name: string;
  company: string;
}

export async function createB2BSession(payload: B2BSession): Promise<void> {
  const token = await new SignJWT({ ...payload, kind: "b2b" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroyB2BSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getB2BSession(): Promise<B2BSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== "b2b") return null;
    return {
      sub: payload.sub as string,
      name: payload.name as string,
      company: payload.company as string,
    };
  } catch {
    return null;
  }
}

/** Сессия + актуальный статус аккаунта из БД (статус мог измениться). */
export async function getB2BAccount() {
  const session = await getB2BSession();
  if (!session) return null;
  const account = await prisma.wholesaleAccount.findUnique({
    where: { id: session.sub },
  });
  if (!account || !account.isActive) return null;
  return account;
}

/** Требует одобренный оптовый аккаунт (для прайса и заявок). */
export async function requireApprovedB2B() {
  const account = await getB2BAccount();
  if (!account || account.status !== "APPROVED") throw new Error("B2B_FORBIDDEN");
  return account;
}

export type B2BAuthResult =
  | { ok: true; accountId: string; status: WholesaleStatus }
  | { ok: false; error: string };

export async function registerWholesale(input: {
  name: string;
  company: string;
  phone: string;
  password: string;
  inn?: string;
  city?: string;
  comment?: string;
}): Promise<B2BAuthResult> {
  const phone = normalizePhone(input.phone);
  if (phone.replace(/\D/g, "").length < 11) return { ok: false, error: "Некорректный номер телефона" };
  if (input.password.length < 6) return { ok: false, error: "Пароль не короче 6 символов" };

  const exists = await prisma.wholesaleAccount.findUnique({ where: { phone } });
  if (exists) return { ok: false, error: "Аккаунт с таким телефоном уже зарегистрирован" };

  const account = await prisma.wholesaleAccount.create({
    data: {
      phone,
      name: input.name.trim(),
      company: input.company.trim(),
      inn: input.inn?.trim() || null,
      city: input.city?.trim() || null,
      comment: input.comment?.trim() || null,
      passwordHash: await bcrypt.hash(input.password, 12),
    },
  });
  await createB2BSession({ sub: account.id, name: account.name, company: account.company });
  return { ok: true, accountId: account.id, status: account.status };
}

export async function loginWholesale(phoneRaw: string, password: string): Promise<B2BAuthResult> {
  const phone = normalizePhone(phoneRaw);
  const account = await prisma.wholesaleAccount.findUnique({ where: { phone } });
  if (!account || !account.isActive || !(await bcrypt.compare(password, account.passwordHash))) {
    return { ok: false, error: "Неверный телефон или пароль" };
  }
  await prisma.wholesaleAccount.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });
  await createB2BSession({ sub: account.id, name: account.name, company: account.company });
  return { ok: true, accountId: account.id, status: account.status };
}
