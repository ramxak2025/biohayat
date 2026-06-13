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
  country: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

function parse(formData: FormData) {
  const obj = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(obj);
  const logo = formData.get("logo")?.toString() || null;
  const flags = {
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    isOwn: formData.get("isOwn") === "on",
  };
  return { parsed, logo, flags };
}

function buildData(
  d: z.infer<typeof schema>,
  logo: string | null,
  flags: { isActive: boolean; isFeatured: boolean; isOwn: boolean },
) {
  return {
    name: d.name.trim(),
    slug: (d.slug?.trim() ? slugify(d.slug) : slugify(d.name)) || slugify(d.name),
    description: d.description || null,
    country: d.country?.trim() || null,
    logo,
    sortOrder: d.sortOrder ?? 0,
    metaTitle: d.metaTitle || null,
    metaDescription: d.metaDescription || null,
    ...flags,
  };
}

function revalidateBrand(slug?: string) {
  // Сбрасывает Data Cache каталога (lib/queries.ts); { expire: 0 } — немедленно.
  revalidateTag("catalog", { expire: 0 });
  revalidatePath("/admin/brands");
  revalidatePath("/catalog");
  revalidatePath("/");
  if (slug) revalidatePath(`/brand/${slug}`);
}

export async function createBrand(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, logo, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, logo, flags);

  const exists = await prisma.brand.findUnique({ where: { slug: data.slug } });
  if (exists) return { error: "Бренд с таким URL (slug) уже существует" };

  await prisma.brand.create({ data });
  revalidateBrand(data.slug);
  redirect("/admin/brands");
}

export async function updateBrand(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, logo, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, logo, flags);

  const clash = await prisma.brand.findFirst({ where: { slug: data.slug, NOT: { id } } });
  if (clash) return { error: "Бренд с таким URL (slug) уже существует" };

  await prisma.brand.update({ data, where: { id } });
  revalidateBrand(data.slug);
  redirect("/admin/brands");
}

export async function deleteBrand(id: string): Promise<void> {
  await requireAdmin();
  // Товары не трогаем: brandId обнулится через onDelete: SetNull.
  await prisma.brand.delete({ where: { id } });
  revalidateBrand();
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
