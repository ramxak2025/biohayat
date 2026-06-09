"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  name: z.string().min(2, "Укажите название"),
  slug: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

function parse(formData: FormData) {
  const obj = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(obj);
  const image = formData.get("image")?.toString() || null;
  const flags = {
    isActive: formData.get("isActive") === "on",
  };
  return { parsed, image, flags };
}

function buildData(d: z.infer<typeof schema>, image: string | null, flags: { isActive: boolean }) {
  return {
    name: d.name.trim(),
    slug: (d.slug?.trim() ? slugify(d.slug) : slugify(d.name)) || slugify(d.name),
    description: d.description || null,
    icon: d.icon || null,
    image,
    sortOrder: d.sortOrder ?? 0,
    metaTitle: d.metaTitle || null,
    metaDescription: d.metaDescription || null,
    ...flags,
  };
}

function revalidateCategory(slug?: string) {
  // Сбрасывает Data Cache каталога (lib/queries.ts); { expire: 0 } — немедленно.
  revalidateTag("catalog", { expire: 0 });
  revalidatePath("/admin/categories");
  revalidatePath("/catalog");
  revalidatePath("/");
  if (slug) revalidatePath(`/category/${slug}`);
}

export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, image, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, image, flags);

  const exists = await prisma.category.findUnique({ where: { slug: data.slug } });
  if (exists) return { error: "Категория с таким URL (slug) уже существует" };

  await prisma.category.create({ data });
  revalidateCategory(data.slug);
  redirect("/admin/categories");
}

export async function updateCategory(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, image, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, image, flags);

  const clash = await prisma.category.findFirst({ where: { slug: data.slug, NOT: { id } } });
  if (clash) return { error: "Категория с таким URL (slug) уже существует" };

  await prisma.category.update({ data, where: { id } });
  revalidateCategory(data.slug);
  redirect("/admin/categories");
}

export async function deleteCategory(id: string): Promise<void> {
  await requireAdmin();
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) {
    throw new Error("Сначала перенесите или удалите товары из категории");
  }
  await prisma.category.delete({ where: { id } });
  revalidateCategory();
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
