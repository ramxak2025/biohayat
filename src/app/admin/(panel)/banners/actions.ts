"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/auth";
import { BannerPlacement } from "@prisma/client";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  title: z.string().min(2, "Укажите заголовок"),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  link: z.string().optional(),
  placement: z.nativeEnum(BannerPlacement),
  bgColor: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
});

function parse(formData: FormData) {
  const obj = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(obj);
  const image = formData.get("image")?.toString() || null;
  const imageMobile = formData.get("imageMobile")?.toString() || null;
  const flags = {
    isActive: formData.get("isActive") === "on",
  };
  return { parsed, image, imageMobile, flags };
}

function buildData(
  d: z.infer<typeof schema>,
  image: string | null,
  imageMobile: string | null,
  flags: { isActive: boolean },
) {
  return {
    title: d.title.trim(),
    subtitle: d.subtitle || null,
    image,
    imageMobile,
    ctaLabel: d.ctaLabel || null,
    link: d.link || null,
    placement: d.placement,
    bgColor: d.bgColor || null,
    sortOrder: d.sortOrder ?? 0,
    ...flags,
  };
}

function revalidateBanner() {
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function createBanner(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, image, imageMobile, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, image, imageMobile, flags);

  await prisma.banner.create({ data });
  revalidateBanner();
  redirect("/admin/banners");
}

export async function updateBanner(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { parsed, image, imageMobile, flags } = parse(formData);
  if (!parsed.success) {
    return { error: "Проверьте поля формы", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = buildData(parsed.data, image, imageMobile, flags);

  await prisma.banner.update({ data, where: { id } });
  revalidateBanner();
  redirect("/admin/banners");
}

export async function deleteBanner(id: string): Promise<void> {
  await requireAdmin();
  await prisma.banner.delete({ where: { id } });
  revalidateBanner();
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
