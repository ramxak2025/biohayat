"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  componentA: z.string().min(1, "Укажите первый компонент"),
  componentB: z.string().min(1, "Укажите второй компонент"),
  type: z.enum(["SYNERGY", "ANTAGONIST", "CAUTION"]),
  note: z.string().optional(),
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
  return {
    componentA: d.componentA.trim(),
    componentB: d.componentB.trim(),
    type: d.type,
    note: d.note?.trim() || null,
    ...flags,
  };
}

function revalidateRule() {
  revalidatePath("/admin/compatibility");
  revalidatePath("/account/compatibility");
}

export async function createRule(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, flags);

  await prisma.compatibilityRule.create({ data });
  revalidateRule();
  redirect("/admin/compatibility");
}

export async function updateRule(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, flags);

  await prisma.compatibilityRule.update({ data, where: { id } });
  revalidateRule();
  redirect("/admin/compatibility");
}

export async function deleteRule(id: string): Promise<void> {
  await requireSession();
  await prisma.compatibilityRule.delete({ where: { id } });
  revalidateRule();
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
