"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  destroyCustomerSession, loginCustomer, registerCustomer, requireCustomer,
} from "@/lib/customer-auth";
import { rateLimit, rateLimitRetryAfter } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/utils";
import { applyReferral } from "@/lib/referral";

export type AuthState = { error?: string };

const AUTH_LIMIT = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 минут

/** IP клиента для rate limiting (за обратным прокси). */
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Проверяет лимит попыток по телефону и IP.
 * Возвращает текст ошибки, если лимит исчерпан, иначе null.
 */
async function checkAuthRateLimit(action: "login" | "register", phone: string): Promise<string | null> {
  const ip = await clientIp();
  const phoneKey = `${action}:${normalizePhone(phone)}`;
  const ipKey = `${action}-ip:${ip}`;
  // Обе попытки регистрируем всегда (без короткого замыкания).
  const phoneOk = rateLimit(phoneKey, AUTH_LIMIT, AUTH_WINDOW_MS);
  const ipOk = rateLimit(ipKey, AUTH_LIMIT, AUTH_WINDOW_MS);
  if (phoneOk && ipOk) return null;
  const retrySec = Math.max(
    rateLimitRetryAfter(phoneKey, AUTH_WINDOW_MS),
    rateLimitRetryAfter(ipKey, AUTH_WINDOW_MS),
  );
  const min = Math.max(1, Math.ceil(retrySec / 60));
  return `Слишком много попыток, попробуйте через ${min} мин`;
}

export async function loginAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const phone = String(fd.get("phone") || "");
  const password = String(fd.get("password") || "");
  const limited = await checkAuthRateLimit("login", phone);
  if (limited) return { error: limited };
  const res = await loginCustomer(phone, password);
  if (!res.ok) return { error: res.error };
  redirect("/account");
}

export async function registerAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const name = String(fd.get("name") || "").trim();
  const phone = String(fd.get("phone") || "");
  const password = String(fd.get("password") || "");
  const email = String(fd.get("email") || "");
  const consent = fd.get("consent") === "on";
  if (name.length < 2) return { error: "Укажите имя" };
  if (!consent) return { error: "Необходимо согласие на обработку персональных данных" };
  const limited = await checkAuthRateLimit("register", phone);
  if (limited) return { error: limited };
  const res = await registerCustomer({ name, phone, password, email });
  if (!res.ok) return { error: res.error };
  redirect("/account");
}

export type ProfileState = { ok?: boolean; error?: string };

export async function updateProfile(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const session = await requireCustomer();
  const name = String(fd.get("name") || "").trim();
  const email = String(fd.get("email") || "").trim();
  const city = String(fd.get("city") || "").trim();
  if (name.length < 2) return { error: "Укажите имя" };
  await prisma.customer.update({
    where: { id: session.sub },
    data: { name, email: email || null, city: city || null },
  });
  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { ok: true };
}

// ─────────────────────────────────────────────
//  Реферальная программа: активация кода друга
// ─────────────────────────────────────────────
export type ReferralState = { ok?: boolean; error?: string };

export async function applyReferralCode(_prev: ReferralState, fd: FormData): Promise<ReferralState> {
  const session = await requireCustomer();
  const code = String(fd.get("code") || "");
  const res = await applyReferral(session.sub, code);
  if (!res.ok) return { error: res.error };
  revalidatePath("/account/referral");
  return { ok: true };
}

// ─────────────────────────────────────────────
//  Безопасность: смена пароля
// ─────────────────────────────────────────────
export type PasswordState = { ok?: boolean; error?: string };

export async function changePassword(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const session = await requireCustomer();
  const current = String(fd.get("currentPassword") || "");
  const next = String(fd.get("newPassword") || "");
  const confirm = String(fd.get("newPassword2") || "");

  if (next.length < 6) return { error: "Новый пароль не короче 6 символов" };
  if (next !== confirm) return { error: "Новые пароли не совпадают" };

  const customer = await prisma.customer.findUnique({ where: { id: session.sub } });
  if (!customer) return { error: "Аккаунт не найден" };
  const ok = await bcrypt.compare(current, customer.passwordHash);
  if (!ok) return { error: "Текущий пароль указан неверно" };

  await prisma.customer.update({
    where: { id: session.sub },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });
  return { ok: true };
}

// ─────────────────────────────────────────────
//  Удаление аккаунта (152-ФЗ): мягкое удаление + анонимизация
// ─────────────────────────────────────────────
export type DeleteAccountState = { error?: string };

export async function deleteAccount(_prev: DeleteAccountState, fd: FormData): Promise<DeleteAccountState> {
  const session = await requireCustomer();
  const password = String(fd.get("password") || "");
  const confirm = fd.get("confirm") === "on";
  if (!confirm) return { error: "Подтвердите, что понимаете последствия удаления" };

  const customer = await prisma.customer.findUnique({ where: { id: session.sub } });
  if (!customer || customer.deletedAt) return { error: "Аккаунт не найден" };
  const ok = await bcrypt.compare(password, customer.passwordHash);
  if (!ok) return { error: "Неверный пароль" };

  await prisma.$transaction([
    prisma.favorite.deleteMany({ where: { customerId: session.sub } }),
    prisma.intakePlan.deleteMany({ where: { customerId: session.sub } }), // логи удалятся каскадно
    prisma.customerAddress.deleteMany({ where: { customerId: session.sub } }),
    prisma.customer.update({
      where: { id: session.sub },
      data: {
        deletedAt: new Date(),
        isActive: false,
        // телефон уникален — заменяем на технический, освобождая номер
        phone: `deleted:${session.sub}`,
        name: "Удалённый аккаунт",
        email: null,
        city: null,
      },
    }),
  ]);

  await destroyCustomerSession();
  redirect("/");
}

// ─────────────────────────────────────────────
//  Сохранённые адреса доставки
// ─────────────────────────────────────────────
export type AddressState = { ok?: boolean; error?: string };

export async function addAddress(_prev: AddressState, fd: FormData): Promise<AddressState> {
  const session = await requireCustomer();
  const label = String(fd.get("label") || "").trim() || null;
  const city = String(fd.get("city") || "").trim();
  const street = String(fd.get("street") || "").trim();
  if (!city) return { error: "Укажите город" };
  if (!street) return { error: "Укажите улицу, дом и квартиру" };

  const count = await prisma.customerAddress.count({ where: { customerId: session.sub } });
  if (count >= 20) return { error: "Можно сохранить не более 20 адресов" };

  await prisma.customerAddress.create({
    data: { customerId: session.sub, label, city, street, isDefault: count === 0 },
  });
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<AddressState> {
  const session = await requireCustomer();
  const address = await prisma.customerAddress.findUnique({ where: { id }, select: { customerId: true } });
  if (!address || address.customerId !== session.sub) return { error: "Адрес не найден" };

  await prisma.$transaction([
    prisma.customerAddress.updateMany({
      where: { customerId: session.sub, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.customerAddress.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<AddressState> {
  const session = await requireCustomer();
  const address = await prisma.customerAddress.findUnique({ where: { id }, select: { customerId: true } });
  if (!address || address.customerId !== session.sub) return { error: "Адрес не найден" };
  await prisma.customerAddress.delete({ where: { id } });
  revalidatePath("/account/addresses");
  return { ok: true };
}
