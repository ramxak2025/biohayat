"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { rubToKopecks } from "@/lib/utils";
import type { DiscountType } from "@prisma/client";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  code: z
    .string()
    .min(2, "Укажите код промокода")
    .max(40, "Слишком длинный код")
    .regex(/^[a-zA-Zа-яА-ЯёЁ0-9_-]+$/, "Только буквы, цифры, дефис и подчёркивание"),
  description: z.string().optional(),
  discountType: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().positive("Укажите размер скидки"),
  minOrderRub: z.coerce.number().min(0).optional(),
  usageLimit: z.string().optional(),
  expiresAt: z.string().optional(),
});

function parse(formData: FormData) {
  const obj = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(obj);
  const flags = {
    isActive: formData.get("isActive") === "on",
  };
  return { parsed, flags };
}

function buildData(d: z.infer<typeof schema>, flags: { isActive: boolean }) {
  // PERCENT — проценты (1..100), FIXED — рубли из формы переводим в копейки
  const value = d.discountType === "PERCENT" ? Math.round(d.value) : rubToKopecks(d.value);
  const usageLimit = d.usageLimit?.trim() ? Math.max(1, Math.round(Number(d.usageLimit))) : null;
  const expiresAt = d.expiresAt?.trim() ? new Date(d.expiresAt) : null;
  return {
    code: d.code.trim().toUpperCase(),
    description: d.description?.trim() || null,
    discountType: d.discountType as DiscountType,
    value,
    minOrderKopecks: rubToKopecks(d.minOrderRub ?? 0),
    usageLimit: usageLimit && Number.isFinite(usageLimit) ? usageLimit : null,
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
    ...flags,
  };
}

function validateValue(d: z.infer<typeof schema>): string | null {
  if (d.discountType === "PERCENT" && (d.value < 1 || d.value > 100)) {
    return "Процент скидки должен быть от 1 до 100";
  }
  return null;
}

function revalidatePromo() {
  revalidatePath("/admin/promocodes");
}

export async function createPromoCode(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const valueError = validateValue(parsed.data);
  if (valueError) return { error: valueError, fieldErrors: { value: valueError } };
  const data = buildData(parsed.data, flags);

  const exists = await prisma.promoCode.findUnique({ where: { code: data.code } });
  if (exists) return { error: "Промокод с таким кодом уже существует" };

  await prisma.promoCode.create({ data });
  revalidatePromo();
  redirect("/admin/promocodes");
}

export async function updatePromoCode(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const valueError = validateValue(parsed.data);
  if (valueError) return { error: valueError, fieldErrors: { value: valueError } };
  const data = buildData(parsed.data, flags);

  const clash = await prisma.promoCode.findFirst({ where: { code: data.code, NOT: { id } } });
  if (clash) return { error: "Промокод с таким кодом уже существует" };

  await prisma.promoCode.update({ data, where: { id } });
  revalidatePromo();
  redirect("/admin/promocodes");
}

/** Быстрая активация/деактивация из списка. */
export async function togglePromoCodeActive(id: string, isActive: boolean): Promise<void> {
  await requireSession();
  await prisma.promoCode.update({ where: { id }, data: { isActive } });
  revalidatePromo();
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
