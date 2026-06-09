"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  title: z.string().min(2, "Укажите заголовок"),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

function parse(formData: FormData) {
  const obj = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(obj);
  const coverImage = formData.get("coverImage")?.toString() || null;
  const flags = {
    isPublished: formData.get("isPublished") === "on",
  };
  return { parsed, coverImage, flags };
}

function buildData(
  d: z.infer<typeof schema>,
  coverImage: string | null,
  flags: { isPublished: boolean },
) {
  return {
    title: d.title.trim(),
    slug: (d.slug?.trim() ? slugify(d.slug) : slugify(d.title)) || slugify(d.title),
    excerpt: d.excerpt || null,
    content: d.content || "",
    coverImage,
    metaTitle: d.metaTitle || null,
    metaDescription: d.metaDescription || null,
    ...flags,
  };
}

function revalidateMaterial(slug?: string) {
  // Сбрасывает Data Cache материалов (lib/queries.ts, тег "content"); немедленно.
  revalidateTag("content", { expire: 0 });
  revalidatePath("/admin/materials");
  revalidatePath("/articles");
  revalidatePath("/");
  if (slug) revalidatePath(`/articles/${slug}`);
}

export async function createMaterial(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, coverImage, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, coverImage, flags);

  const exists = await prisma.material.findUnique({ where: { slug: data.slug } });
  if (exists) return { error: "Материал с таким URL (slug) уже существует" };

  await prisma.material.create({
    data: {
      ...data,
      publishedAt: data.isPublished ? new Date() : null,
    },
  });
  revalidateMaterial(data.slug);
  redirect("/admin/materials");
}

export async function updateMaterial(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, coverImage, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, coverImage, flags);

  const clash = await prisma.material.findFirst({ where: { slug: data.slug, NOT: { id } } });
  if (clash) return { error: "Материал с таким URL (slug) уже существует" };

  const current = await prisma.material.findUnique({ where: { id }, select: { publishedAt: true } });
  const publishedAt = data.isPublished ? current?.publishedAt ?? new Date() : null;

  await prisma.material.update({
    data: { ...data, publishedAt },
    where: { id },
  });
  revalidateMaterial(data.slug);
  redirect("/admin/materials");
}

export async function deleteMaterial(id: string): Promise<void> {
  await requireAdmin();
  await prisma.material.delete({ where: { id } });
  revalidateMaterial();
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
