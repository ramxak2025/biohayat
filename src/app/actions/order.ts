"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { syncOrderToBitrix } from "@/lib/bitrix";

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceKopecks: z.number().int().nonnegative(),
  qty: z.number().int().min(1).max(99),
});

const orderSchema = z.object({
  customerName: z.string().min(2, "Укажите имя").max(120),
  phone: z
    .string()
    .min(10, "Укажите корректный телефон")
    .regex(/[\d+()\-\s]{10,}/, "Некорректный телефон"),
  email: z.string().email("Некорректный e-mail").optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  comment: z.string().max(1000).optional().or(z.literal("")),
  consent: z.literal(true, { message: "Необходимо согласие на обработку персональных данных" }),
  items: z.array(itemSchema).min(1, "Корзина пуста"),
});

export type OrderActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  orderNumber?: number;
};

export async function submitOrder(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const raw = {
    customerName: String(formData.get("customerName") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    address: String(formData.get("address") || ""),
    comment: String(formData.get("comment") || ""),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
    items: JSON.parse(String(formData.get("items") || "[]")),
  };

  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Проверьте правильность заполнения формы", fieldErrors };
  }

  const data = parsed.data;
  // Перепроверяем цены по БД (защита от подмены на клиенте).
  const products = await prisma.product.findMany({
    where: { id: { in: data.items.map((i) => i.id) } },
    select: { id: true, name: true, priceKopecks: true },
  });
  const priceById = new Map(products.map((p) => [p.id, p]));

  const items = data.items.map((i) => {
    const p = priceById.get(i.id);
    return {
      productId: p ? i.id : null,
      name: p?.name ?? i.name,
      priceKopecks: p?.priceKopecks ?? i.priceKopecks,
      qty: i.qty,
    };
  });
  const totalKopecks = items.reduce((s, i) => s + i.priceKopecks * i.qty, 0);

  const referer = (await headers()).get("referer") || undefined;

  const order = await prisma.order.create({
    data: {
      customerName: data.customerName.trim(),
      phone: data.phone.trim(),
      email: data.email || null,
      address: data.address || null,
      comment: data.comment || null,
      totalKopecks,
      consentGiven: true,
      consentAt: new Date(),
      source: referer ? "Сайт biohayat.ru" : "Сайт",
      items: { create: items },
    },
  });

  // Отправка лида в Битрикс24 (не блокирует ответ при ошибке — статус сохраняется в БД).
  await syncOrderToBitrix(order.id);

  return { ok: true, orderNumber: order.number };
}
