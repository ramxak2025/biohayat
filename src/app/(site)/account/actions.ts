"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";

export type ProfileState = { ok?: boolean; error?: string };

export async function updateProfile(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const session = await requireCustomer();
  const name = String(fd.get("name") || "").trim();
  const email = String(fd.get("email") || "").trim();
  const city = String(fd.get("city") || "").trim();
  if (name.length < 2) return { error: "Укажите имя" };

  // Дата рождения — безопасный парсинг строки YYYY-MM-DD из поля type="date".
  const birthRaw = String(fd.get("birthDate") || "").trim();
  let birthDate: Date | null = null;
  if (birthRaw) {
    const parsed = new Date(birthRaw);
    if (!Number.isNaN(parsed.getTime())) birthDate = parsed;
  }

  // Пол — только из допустимого набора, иначе сбрасываем в null.
  const genderRaw = String(fd.get("gender") || "").trim();
  const gender = genderRaw === "male" || genderRaw === "female" ? genderRaw : null;

  await prisma.customer.update({
    where: { id: session.sub },
    data: {
      name,
      email: email || null,
      city: city || null,
      birthDate,
      gender,
    },
  });
  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { ok: true };
}

export type PasswordState = { ok?: boolean; error?: string };

/** Смена пароля: проверка старого через bcrypt, хеширование нового. */
export async function changePassword(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const session = await requireCustomer();
  const oldPassword = String(fd.get("oldPassword") || "");
  const newPassword = String(fd.get("newPassword") || "");

  if (newPassword.length < 6) return { error: "Новый пароль не короче 6 символов" };

  const customer = await prisma.customer.findUnique({ where: { id: session.sub } });
  if (!customer) return { error: "Профиль не найден" };

  const ok = await bcrypt.compare(oldPassword, customer.passwordHash);
  if (!ok) return { error: "Текущий пароль указан неверно" };

  await prisma.customer.update({
    where: { id: session.sub },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
  return { ok: true };
}
