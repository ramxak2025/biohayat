"use server";

import { prisma } from "@/lib/prisma";
import { requireApprovedB2B } from "@/lib/b2b-auth";
import { rateLimit } from "@/lib/rate-limit";
import { unitPriceForQty } from "@/lib/wholesale";

export type SubmitWholesaleResult =
  | { ok: true; number: number }
  | { ok: false; error: string };

const MAX_QTY = 10000;
const MAX_POSITIONS = 200;
const MAX_COMMENT = 2000;

/**
 * Создаёт оптовую заявку. Клиентские цены — только превью: здесь всё
 * пересчитывается заново по лесенке из БД (unitPriceForQty), чтобы
 * подмена цены на клиенте была невозможна.
 */
export async function submitWholesaleRequest(input: {
  items: { productId: string; qty: number }[];
  comment?: string;
}): Promise<SubmitWholesaleResult> {
  let account;
  try {
    account = await requireApprovedB2B();
  } catch {
    return { ok: false, error: "Доступ к оптовым ценам не подтверждён. Войдите в аккаунт." };
  }

  // Антиспам: не более 5 заявок в час на аккаунт.
  if (!rateLimit(`b2b-request:${account.id}`, 5, 60 * 60 * 1000)) {
    return { ok: false, error: "Слишком много заявок. Не более 5 заявок в час — попробуйте позже." };
  }

  // ── Валидация структуры ──
  if (!Array.isArray(input?.items) || input.items.length === 0) {
    return { ok: false, error: "Заявка пуста — добавьте товары из прайса." };
  }
  if (input.items.length > MAX_POSITIONS) {
    return { ok: false, error: `Слишком много позиций (максимум ${MAX_POSITIONS}).` };
  }

  // Дедупликация позиций (суммируем количество).
  const qtyByProduct = new Map<string, number>();
  for (const raw of input.items) {
    const productId = typeof raw?.productId === "string" ? raw.productId : "";
    const qty = Math.floor(Number(raw?.qty));
    if (!productId || !Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
      return { ok: false, error: "Некорректное количество товара (допустимо от 1 до 10 000 шт)." };
    }
    const next = (qtyByProduct.get(productId) ?? 0) + qty;
    if (next > MAX_QTY) {
      return { ok: false, error: "Некорректное количество товара (допустимо от 1 до 10 000 шт)." };
    }
    qtyByProduct.set(productId, next);
  }

  const comment = String(input.comment ?? "").trim().slice(0, MAX_COMMENT) || null;

  // ── Товары существуют, активны и продаются оптом ──
  const ids = [...qtyByProduct.keys()];
  const products = await prisma.product.findMany({
    // Лесенка необязательна: товары «по запросу» идут по розничной цене,
    // менеджер согласует скидку при обработке заявки.
    where: { id: { in: ids }, isActive: true },
    include: { wholesaleTiers: { orderBy: { minQty: "asc" } } },
  });
  if (products.length !== ids.length) {
    return {
      ok: false,
      error: "Часть товаров больше недоступна для опта. Обновите прайс и проверьте заявку.",
    };
  }

  // ── Пересчёт цен СТРОГО на сервере по лесенке ──
  const orderItems = products.map((p) => {
    const qty = qtyByProduct.get(p.id)!;
    return {
      productId: p.id,
      name: p.name,
      qty,
      priceKopecks: unitPriceForQty(p.priceKopecks, p.wholesaleTiers, qty),
    };
  });
  const totalKopecks = orderItems.reduce((s, i) => s + i.priceKopecks * i.qty, 0);

  const order = await prisma.$transaction(async (tx) => {
    return tx.wholesaleOrder.create({
      data: {
        accountId: account.id,
        totalKopecks,
        comment,
        items: { create: orderItems },
      },
      select: { number: true },
    });
  });

  return { ok: true, number: order.number };
}
