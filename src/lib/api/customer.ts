import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";
import { signCustomerToken } from "@/lib/api/token";
import type { Customer } from "@prisma/client";

/**
 * Регистрация/вход для REST API (мобильное приложение): без cookie,
 * возвращает Bearer-токен в теле ответа.
 */

export function serializeCustomer(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    city: c.city,
    bonusBalance: c.bonusBalance,
    createdAt: c.createdAt,
  };
}

const ACCESS_TTL = 60 * 60 * 24 * 30; // 30 дней

type ApiAuthOk = { ok: true; token: string; expiresInSec: number; customer: Customer };
type ApiAuthErr = { ok: false; error: string; status: number };

async function issue(customer: Customer): Promise<ApiAuthOk> {
  const token = await signCustomerToken(
    { sub: customer.id, phone: customer.phone, name: customer.name },
    ACCESS_TTL,
  );
  return { ok: true, token, expiresInSec: ACCESS_TTL, customer };
}

export async function apiRegister(input: {
  name: string;
  phone: string;
  password: string;
  email?: string;
}): Promise<ApiAuthOk | ApiAuthErr> {
  const phone = normalizePhone(input.phone);
  if (phone.replace(/\D/g, "").length < 11) return { ok: false, error: "Некорректный номер телефона", status: 400 };
  if ((input.name || "").trim().length < 2) return { ok: false, error: "Укажите имя", status: 400 };
  if ((input.password || "").length < 6) return { ok: false, error: "Пароль не короче 6 символов", status: 400 };

  const exists = await prisma.customer.findUnique({ where: { phone } });
  if (exists) return { ok: false, error: "Пользователь с таким телефоном уже зарегистрирован", status: 409 };

  const customer = await prisma.customer.create({
    data: {
      phone,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      passwordHash: await bcrypt.hash(input.password, 12),
    },
  });
  return issue(customer);
}

export async function apiLogin(phoneRaw: string, password: string): Promise<ApiAuthOk | ApiAuthErr> {
  const phone = normalizePhone(phoneRaw);
  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer || !customer.isActive) return { ok: false, error: "Неверный телефон или пароль", status: 401 };
  const ok = await bcrypt.compare(password, customer.passwordHash);
  if (!ok) return { ok: false, error: "Неверный телефон или пароль", status: 401 };
  await prisma.customer.update({ where: { id: customer.id }, data: { lastLoginAt: new Date() } });
  return issue(customer);
}
