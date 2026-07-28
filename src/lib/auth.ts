import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { shouldSetSecureCookie } from "@/lib/cookie-security";
import type { AdminRole } from "@prisma/client";

const COOKIE_NAME = "hayat_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 дней

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET не задан или слишком короткий (мин. 16 символов).");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // id админа
  email: string;
  name: string;
  role: AdminRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: await shouldSetSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Возвращает payload текущей сессии или null. Сверяет статус с БД. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub as string;
    if (!sub) return null;
    // Перепроверяем по БД: деактивированный/удалённый админ теряет доступ сразу,
    // роль берём актуальную (на случай понижения прав).
    const user = await prisma.adminUser.findUnique({
      where: { id: sub },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) return null;
    return { sub: user.id, email: user.email, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

/** Проверяет логин/пароль и создаёт сессию. Возвращает true при успехе. */
export async function authenticate(email: string, password: string): Promise<boolean> {
  const user = await prisma.adminUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user || !user.isActive) return false;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return false;

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  return true;
}

/** Бросает, если нет сессии. Использовать в серверных экшенах админки. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

/**
 * Бросает, если у админа нет требуемой роли. Использовать для опасных действий
 * (настройки, интеграции, удаление), доступных только полному администратору.
 */
export async function requireRole(role: AdminRole): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== role) throw new Error("FORBIDDEN");
  return session;
}
