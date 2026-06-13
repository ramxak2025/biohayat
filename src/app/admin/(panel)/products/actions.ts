"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/auth";
import { slugify, rubToKopecks } from "@/lib/utils";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  name: z.string().min(2, "Укажите название"),
  slug: z.string().optional(),
  categoryId: z.string().min(1, "Выберите категорию"),
  // Бренд: пустое значение → null (собственный бренд ХАЯТ).
  brandId: z.string().optional(),
  priceRub: z.coerce.number().min(0, "Цена не может быть отрицательной"),
  oldPriceRub: z.coerce.number().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  composition: z.string().optional(),
  usage: z.string().optional(),
  contraindications: z.string().optional(),
  volume: z.string().optional(),
  sku: z.string().optional(),
  // Остаток на складе: пустая строка → null (учёт выключен, продаём как раньше).
  stockQty: z
    .string()
    .optional()
    .transform((s, ctx) => {
      const v = s?.trim();
      if (!v) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) {
        ctx.addIssue({ code: "custom", message: "Целое число от 0" });
        return z.NEVER;
      }
      return n;
    }),
  badges: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

/**
 * Лесенка оптовых цен: до 3 уровней из полей tier{1..3}MinQty / tier{1..3}Price.
 * Пустая пара полей — уровень не используется. Цена приходит в рублях → копейки.
 */
function parseTiers(
  formData: FormData,
): { tiers: { minQty: number; priceKopecks: number }[] } | { error: string } {
  const tiers: { minQty: number; priceKopecks: number }[] = [];
  for (const i of [1, 2, 3] as const) {
    const qtyRaw = String(formData.get(`tier${i}MinQty`) ?? "").trim();
    const priceRaw = String(formData.get(`tier${i}Price`) ?? "").trim().replace(",", ".");
    if (!qtyRaw && !priceRaw) continue;
    if (!qtyRaw || !priceRaw) return { error: `Уровень ${i}: заполните и количество, и цену` };
    const minQty = Number(qtyRaw);
    const price = Number(priceRaw);
    if (!Number.isInteger(minQty) || minQty < 2) {
      return { error: `Уровень ${i}: «от … шт» — целое число от 2` };
    }
    if (!Number.isFinite(price) || price <= 0) {
      return { error: `Уровень ${i}: цена должна быть больше нуля` };
    }
    tiers.push({ minQty, priceKopecks: rubToKopecks(price) });
  }
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].minQty <= tiers[i - 1].minQty) {
      return { error: "Количества «от … шт» должны идти по возрастанию" };
    }
  }
  return { tiers };
}

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
    brandId: d.brandId?.trim() || null,
    priceKopecks: rubToKopecks(d.priceRub),
    oldPriceKopecks: d.oldPriceRub ? rubToKopecks(d.oldPriceRub) : null,
    shortDescription: d.shortDescription || null,
    description: d.description || null,
    composition: d.composition || null,
    usage: d.usage || null,
    contraindications: d.contraindications || null,
    volume: d.volume || null,
    sku: d.sku || null,
    stockQty: d.stockQty,
    badges,
    metaTitle: d.metaTitle || null,
    metaDescription: d.metaDescription || null,
    ...flags,
  };
}

function revalidateProduct(slug?: string) {
  // Сбрасывает Data Cache каталога (lib/queries.ts); { expire: 0 } — немедленно,
  // чтобы админ сразу видел изменения на публичных страницах.
  revalidateTag("catalog", { expire: 0 });
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
  const tiersResult = parseTiers(formData);
  if ("error" in tiersResult) {
    return { error: "Проверьте поля формы", fieldErrors: { tiers: tiersResult.error } };
  }
  const data = buildData(parsed.data, flags);

  const exists = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (exists) return { error: "Товар с таким URL (slug) уже существует" };

  await prisma.product.create({
    data: {
      ...data,
      images: { create: images.map((url, i) => ({ url, sortOrder: i })) },
      wholesaleTiers: { create: tiersResult.tiers },
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
  const tiersResult = parseTiers(formData);
  if ("error" in tiersResult) {
    return { error: "Проверьте поля формы", fieldErrors: { tiers: tiersResult.error } };
  }
  const data = buildData(parsed.data, flags);

  const clash = await prisma.product.findFirst({ where: { slug: data.slug, NOT: { id } } });
  if (clash) return { error: "Товар с таким URL (slug) уже существует" };

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: id } }),
    prisma.wholesaleTier.deleteMany({ where: { productId: id } }),
    prisma.product.update({
      data: {
        ...data,
        images: { create: images.map((url, i) => ({ url, sortOrder: i })) },
        wholesaleTiers: { create: tiersResult.tiers },
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
