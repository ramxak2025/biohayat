"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import type { PromoCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncOrderToBitrix } from "@/lib/bitrix";
import { getCustomerSession } from "@/lib/customer-auth";

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

/** Недостаточно товара на складе (текст уже готов для показа пользователю). */
class StockError extends Error {}

export type OrderActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  orderNumber?: number;
};

// ─────────────────────────────────────────────
//  Промокоды
// ─────────────────────────────────────────────
export type PromoResult =
  | { ok: true; code: string; discountKopecks: number }
  | { ok: false; error: string };

/** Ищет промокод без учёта регистра. */
async function findPromo(codeRaw: string): Promise<PromoCode | null> {
  const code = codeRaw.trim();
  if (!code) return null;
  return prisma.promoCode.findFirst({
    where: { code: { equals: code, mode: "insensitive" } },
  });
}

/** Проверяет применимость промокода к сумме и считает скидку в копейках. */
function promoDiscount(promo: PromoCode, subtotalKopecks: number): PromoResult {
  if (!promo.isActive) return { ok: false, error: "Промокод не действует" };
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Срок действия промокода истёк" };
  }
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return { ok: false, error: "Лимит применений промокода исчерпан" };
  }
  if (subtotalKopecks < promo.minOrderKopecks) {
    const min = Math.ceil(promo.minOrderKopecks / 100).toLocaleString("ru-RU");
    return { ok: false, error: `Промокод действует для заказов от ${min} ₽` };
  }
  const discount =
    promo.discountType === "PERCENT"
      ? Math.round((subtotalKopecks * promo.value) / 100)
      : promo.value;
  return {
    ok: true,
    code: promo.code,
    discountKopecks: Math.min(Math.max(discount, 0), subtotalKopecks),
  };
}

/** Server action для checkout: проверка промокода и расчёт скидки. */
export async function validatePromo(codeRaw: string, subtotalKopecks: number): Promise<PromoResult> {
  const promo = await findPromo(codeRaw);
  if (!promo) return { ok: false, error: "Такого промокода не существует" };
  return promoDiscount(promo, Math.max(0, Math.round(subtotalKopecks)));
}

// ─────────────────────────────────────────────
//  Оформление заказа
// ─────────────────────────────────────────────
export async function submitOrder(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  let rawItems: unknown = [];
  try {
    rawItems = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    rawItems = [];
  }
  const raw = {
    customerName: String(formData.get("customerName") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    address: String(formData.get("address") || ""),
    comment: String(formData.get("comment") || ""),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
    items: rawItems,
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
    select: { id: true, name: true, priceKopecks: true, stockQty: true },
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
  const subtotalKopecks = items.reduce((s, i) => s + i.priceKopecks * i.qty, 0);

  // Промокод: скидка всегда пересчитывается на сервере по коду.
  const promoCodeRaw = String(formData.get("promoCode") || "").trim();
  let promo: PromoCode | null = null;
  let discountKopecks = 0;
  if (promoCodeRaw) {
    promo = await findPromo(promoCodeRaw);
    const res = promo ? promoDiscount(promo, subtotalKopecks) : null;
    if (!promo || !res || !res.ok) {
      return {
        ok: false,
        error: "Промокод больше не действует. Удалите его и отправьте заказ ещё раз.",
        fieldErrors: { promoCode: res && !res.ok ? res.error : "Такого промокода не существует" },
      };
    }
    discountKopecks = res.discountKopecks;
  }

  const totalKopecks = Math.max(0, subtotalKopecks - discountKopecks);

  const referer = (await headers()).get("referer") || undefined;
  const session = await getCustomerSession();

  // Позиции с включённым учётом остатков (stockQty != null) — для списания.
  const trackedItems = items.filter(
    (i) => i.productId !== null && priceById.get(i.productId)?.stockQty != null,
  );

  let stockError: string | null = null;

  const order = await prisma
    .$transaction(async (tx) => {
      // Атомарно занимаем применение промокода: updateMany с условием по лимиту
      // защищает от гонки двух параллельных заказов на последнее применение.
      if (promo) {
        const claimed = await tx.promoCode.updateMany({
          where: {
            id: promo.id,
            isActive: true,
            ...(promo.usageLimit !== null ? { usedCount: { lt: promo.usageLimit } } : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (claimed.count === 0) throw new Error("PROMO_EXHAUSTED");
      }

      // Списание остатков: updateMany с условием stockQty >= qty атомарно
      // защищает от гонки двух параллельных заказов на последние штуки.
      // count === 0 — остатка не хватает, транзакция откатывается целиком.
      for (const it of trackedItems) {
        const decremented = await tx.product.updateMany({
          where: { id: it.productId!, stockQty: { gte: it.qty } },
          data: { stockQty: { decrement: it.qty } },
        });
        if (decremented.count === 0) {
          const fresh = await tx.product.findUnique({
            where: { id: it.productId! },
            select: { stockQty: true },
          });
          throw new StockError(
            `«${it.name}»: осталось всего ${Math.max(0, fresh?.stockQty ?? 0)} шт`,
          );
        }
        // Остаток дошёл до нуля — снимаем флаг наличия.
        await tx.product.updateMany({
          where: { id: it.productId!, stockQty: { lte: 0 } },
          data: { inStock: false },
        });
      }

      return tx.order.create({
        data: {
          customerName: data.customerName.trim(),
          phone: data.phone.trim(),
          email: data.email || null,
          address: data.address || null,
          comment: data.comment || null,
          totalKopecks,
          promoCode: promo?.code ?? null,
          discountKopecks,
          consentGiven: true,
          consentAt: new Date(),
          source: referer ? "Сайт biohayat.ru" : "Сайт",
          customerId: session?.sub ?? null,
          items: { create: items },
        },
      });
    })
    .catch((e: unknown) => {
      if (e instanceof StockError) {
        stockError = e.message;
        return null;
      }
      if (e instanceof Error && e.message === "PROMO_EXHAUSTED") return null;
      throw e;
    });

  if (!order) {
    if (stockError) {
      return {
        ok: false,
        error: `${stockError}. Уменьшите количество в корзине и отправьте заказ ещё раз.`,
      };
    }
    return {
      ok: false,
      error: "Промокод только что исчерпан. Удалите его и отправьте заказ ещё раз.",
      fieldErrors: { promoCode: "Лимит применений промокода исчерпан" },
    };
  }

  // Остатки изменились — сбрасываем кэш каталога, чтобы бейджи и «нет в наличии»
  // на витрине не отставали (тот же тег, что в админских actions товаров).
  if (trackedItems.length > 0) revalidateTag("catalog", { expire: 0 });

  // Сохранение адреса в ЛК (по галочке «Сохранить адрес»).
  if (session && formData.get("saveAddress") === "on" && data.address) {
    const [cityPart, ...restParts] = data.address.split(",");
    const city = cityPart.trim();
    const street = restParts.join(",").trim() || city;
    const exists = await prisma.customerAddress.findFirst({
      where: { customerId: session.sub, city, street },
      select: { id: true },
    });
    if (!exists) {
      const count = await prisma.customerAddress.count({ where: { customerId: session.sub } });
      if (count < 20) {
        await prisma.customerAddress.create({
          data: { customerId: session.sub, city, street, isDefault: count === 0 },
        });
      }
    }
  }

  // Отправка лида в Битрикс24 (не блокирует ответ при ошибке — статус сохраняется в БД).
  await syncOrderToBitrix(order.id);

  return { ok: true, orderNumber: order.number };
}

// ─────────────────────────────────────────────
//  Повтор заказа: позиции с актуальными ценами из БД
// ─────────────────────────────────────────────
export type RepeatOrderItem = {
  id: string;
  slug: string;
  name: string;
  priceKopecks: number;
  image: string | null;
  qty: number;
};

export type RepeatOrderResult =
  | { ok: true; items: RepeatOrderItem[]; skipped: number }
  | { ok: false; error: string };

export async function repeatOrder(orderId: string): Promise<RepeatOrderResult> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Войдите в личный кабинет" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.customerId !== session.sub) return { ok: false, error: "Заказ не найден" };

  const productIds = order.items.map((i) => i.productId).filter((id): id is string => Boolean(id));
  // Только активные товары и актуальные цены из каталога.
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: RepeatOrderItem[] = [];
  let skipped = 0;
  for (const it of order.items) {
    const p = it.productId ? byId.get(it.productId) : undefined;
    if (!p) {
      skipped += 1;
      continue;
    }
    items.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      priceKopecks: p.priceKopecks,
      image: p.images[0]?.url ?? null,
      qty: it.qty,
    });
  }

  if (items.length === 0) return { ok: false, error: "Товары из заказа больше не продаются" };
  return { ok: true, items, skipped };
}
