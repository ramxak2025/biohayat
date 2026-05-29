"use server";

import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");
  if (!email || !password) return { error: "Введите e-mail и пароль" };

  const ok = await authenticate(email, password);
  if (!ok) return { error: "Неверный e-mail или пароль" };

  // Сессия записана в cookie — переходим в админку.
  redirect(next.startsWith("/admin") ? next : "/admin");
}
