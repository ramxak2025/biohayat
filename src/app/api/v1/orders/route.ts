// POST /api/v1/orders — оформление заказа из мобильного приложения.
// Цены берутся ТОЛЬКО из БД (защита от подмены на клиенте);
// привязка к покупателю — если передан валидный Bearer-токен.
// Аналог server action src/app/actions/order.ts, включая отправку лида в Битрикс24.

import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { syncOrderToBitrix } from "@/lib/bitrix";
import { rateLimit, rateLimitRetryAfter } from "@/lib/rate-limit";
import { apiOk, apiError, zodMessage, withErrorHandling } from "../_lib/response";
import { requireActiveCustomer, getClientIp } from "../_lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Щадящий лимит против спама заявками: 10 заказов за 15 минут с одного IP.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 15 * 60 * 1000;

const bodySchema = z.object({
  customerName: z.string().min(2, "Укажите имя").max(120),
  phone: z
    .string()
    .min(10, "Укажите корректный телефон")
    .regex(/[\d+()\-\s]{10,}/, "Некорректный телефон"),
  email: z.string().email("Некорректный e-mail").optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  comment: z.string().max(1000).optional().or(z.literal("")),
  consent: z.literal(true, {
    message: "Необходимо согласие на обработку персональных данных",
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1, "Корзина пуста")
    .max(100),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const key = `v1:orders:${getClientIp(req)}`;
  if (!rateLimit(key, RATE_LIMIT, RATE_WINDOW_MS)) {
    const retryAfter = rateLimitRetryAfter(key, RATE_WINDOW_MS);
    return apiError(429, "RATE_LIMITED", "Слишком много заказов. Повторите позже.", {
      "Retry-After": String(retryAfter),
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", zodMessage(parsed.error));
  const data = parsed.data;

  // Схлопываем дубли productId, суммируя количество (потолок 99).
  const qtyById = new Map<string, number>();
  for (const item of data.items) {
    qtyById.set(item.productId, Math.min(99, (qtyById.get(item.productId) ?? 0) + item.qty));
  }

  // Цены и названия — только из БД; неактивные товары заказать нельзя.
  const products = await prisma.product.findMany({
    where: { id: { in: [...qtyById.keys()] }, isActive: true },
    select: { id: true, name: true, priceKopecks: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const missing = [...qtyById.keys()].filter((id) => !productById.has(id));
  if (missing.length > 0) {
    return apiError(
      400,
      "PRODUCT_NOT_FOUND",
      `Товар недоступен или не найден: ${missing.join(", ")}`,
    );
  }

  const items = [...qtyById.entries()].map(([productId, qty]) => {
    const p = productById.get(productId)!;
    return { productId, name: p.name, priceKopecks: p.priceKopecks, qty };
  });
  const totalKopecks = items.reduce((sum, it) => sum + it.priceKopecks * it.qty, 0);

  // Привязка к аккаунту, если передан валидный Bearer (заказ доступен и гостю).
  const customer = await requireActiveCustomer(req);

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
      source: "Мобильное приложение (API v1)",
      customerId: customer?.id ?? null,
      items: { create: items },
    },
    include: { items: true },
  });

  // Отправка лида в Битрикс24 (ошибка не блокирует ответ — статус сохраняется в БД).
  await syncOrderToBitrix(order.id);

  return apiOk(
    {
      orderId: order.id,
      number: order.number,
      totalKopecks: order.totalKopecks,
      status: order.status,
      items: order.items.map((it) => ({
        productId: it.productId,
        name: it.name,
        priceKopecks: it.priceKopecks,
        qty: it.qty,
      })),
    },
    undefined,
    { status: 201 },
  );
});
