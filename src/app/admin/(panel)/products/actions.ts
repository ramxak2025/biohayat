"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/auth";
import { slugify, rubToKopecks } from "@/lib/utils";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  name: z.string().min(2, "Укажите название"),
  slug: z.string().optional(),
  categoryId: z.string().min(1, "Выберите категорию"),
  priceRub: z.coerce.number().min(0, "Цена не может быть отрицательной"),
  oldPriceRub: z.coerce.number().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  composition: z.string().optional(),
  usage: z.string().optional(),
  contraindications: z.string().optional(),
  volume: z.string().optional(),
  sku: z.string().optional(),
  badges: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

function parse(formData: FormData) {
  const obj = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(obj);
  const images = formData.getAll("images").map(String).filter(Boolean);
  const flags = {
    inStock: formData.get("inStock") === "on",
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
  };
  return { parsed, images, flags };
}

function buildData(d: z.infer<typeof schema>, flags: { inStock: boolean; isActive: boolean; isFeatured: boolean }) {
  const badges = (d.badges || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    name: d.name.trim(),
    slug: (d.slug?.trim() ? slugify(d.slug) : slugify(d.name)) || slugify(d.name),
    categoryId: d.categoryId,
    priceKopecks: rubToKopecks(d.priceRub),
    oldPriceKopecks: d.oldPriceRub ? rubToKopecks(d.oldPriceRub) : null,
    shortDescription: d.shortDescription || null,
    description: d.description || null,
    composition: d.composition || null,
    usage: d.usage || null,
    contraindications: d.contraindications || null,
    volume: d.volume || null,
    sku: d.sku || null,
    badges,
    metaTitle: d.metaTitle || null,
    metaDescription: d.metaDescription || null,
    ...flags,
  };
}

function revalidateProduct(slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  revalidatePath("/");
  if (slug) revalidatePath(`/product/${slug}`);
}

export async function createProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, images, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, flags);

  const exists = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (exists) return { error: "Товар с таким URL (slug) уже существует" };

  await prisma.product.create({
    data: {
      ...data,
      images: { create: images.map((url, i) => ({ url, sortOrder: i })) },
    },
  });
  revalidateProduct(data.slug);
  redirect("/admin/products");
}

export async function updateProduct(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, images, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, flags);

  const clash = await prisma.product.findFirst({ where: { slug: data.slug, NOT: { id } } });
  if (clash) return { error: "Товар с таким URL (slug) уже существует" };

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: id } }),
    prisma.product.update({
      data: {
        ...data,
        images: { create: images.map((url, i) => ({ url, sortOrder: i })) },
      },
      where: { id },
    }),
  ]);
  revalidateProduct(data.slug);
  redirect("/admin/products");
}

export async function deleteProduct(id: string): Promise<void> {
  await requireAdmin();
  await prisma.product.delete({ where: { id } });
  revalidateProduct();
}

export async function toggleProductActive(id: string, isActive: boolean): Promise<void> {
  await requireSession();
  await prisma.product.update({ where: { id }, data: { isActive } });
  revalidateProduct();
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
