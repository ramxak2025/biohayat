"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  destroyCustomerSession, requireCustomer,
} from "@/lib/customer-auth";
import { applyReferral } from "@/lib/referral";

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
