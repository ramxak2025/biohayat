"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { loginCustomer, registerCustomer, requireCustomer } from "@/lib/customer-auth";

export type AuthState = { error?: string };

export async function loginAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const phone = String(fd.get("phone") || "");
  const password = String(fd.get("password") || "");
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
