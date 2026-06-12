"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/auth";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  title: z.string().min(2, "Укажите подпись кружка"),
  text: z.string().optional(),
  ctaLabel: z.string().optional(),
  link: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
});

function parse(formData: FormData) {
  const obj = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(obj);
  const cover = formData.get("cover")?.toString() || null;
  const image = formData.get("image")?.toString() || null;
  const isActive = formData.get("isActive") === "on";
  return { parsed, cover, image, isActive };
}

function buildData(
  d: z.infer<typeof schema>,
  cover: string | null,
  image: string | null,
  isActive: boolean,
) {
  return {
    title: d.title.trim(),
    text: d.text || null,
    ctaLabel: d.ctaLabel || null,
    link: d.link || null,
    cover,
    image,
    sortOrder: d.sortOrder ?? 0,
    isActive,
  };
}

function revalidateStories() {
  revalidateTag("content", { expire: 0 });
  revalidatePath("/admin/stories");
  revalidatePath("/");
}

export async function createStory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, cover, image, isActive } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  await prisma.story.create({ data: buildData(parsed.data, cover, image, isActive) });
  revalidateStories();
  redirect("/admin/stories");
}

export async function updateStory(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, cover, image, isActive } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  await prisma.story.update({ where: { id }, data: buildData(parsed.data, cover, image, isActive) });
  revalidateStories();
  redirect("/admin/stories");
}

export async function deleteStory(id: string): Promise<void> {
  await requireAdmin();
  await prisma.story.delete({ where: { id } });
  revalidateStories();
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
