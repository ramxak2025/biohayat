import { createHash } from "node:crypto";
import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiOk, apiError, apiInternal, apiPreflight, parsePaging } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeOrder } from "@/lib/api/serializers";
import { syncOrderToBitrix } from "@/lib/bitrix";
import { selectedCrmProvider } from "@/lib/crm-transport";
import { retailEvent } from "@/lib/crm-events";
import { enqueueCrmEvent, tryDeliverCrmEvent } from "@/lib/crm-outbox";
import { afterAcceptance } from "@/lib/after-acceptance";
import { hit, clientIp, key } from "@/lib/api/rate-limit";
import { formatAddressLine } from "../addresses/_address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** Оформление заказа: 10 попыток за 10 минут на связку IP + покупатель. */
const ORDER_LIMIT = 10;
const ORDER_WINDOW_SEC = 10 * 60;

const schema = z.object({
  requestKey: z.string().uuid(),
  expectedTotalKopecks: z.number().int().min(0).max(2147483647),
  customerName: z.string().min(2).max(120),
  phone: z.string().min(10).regex(/[\d+()\-\s]{10,}/),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  /** Адрес из адресной книги: строку доставки собирает сервер (сайт по-прежнему шлёт address). */
  addressId: z.string().min(1).max(64).optional(),
  comment: z.string().max(1000).optional().or(z.literal("")),
  consent: z.literal(true),
  items: z.array(z.object({ id: z.string(), qty: z.number().int().min(1).max(99) })).min(1).max(100),
});

/** POST /api/v2/orders — оформление заказа (опциональная авторизация). */
export async function POST(req: Request) {
  try {
    const session = await getApiCustomer(req);
    if (req.headers.has("authorization") && !session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    // Лимит до разбора тела: заказ создаёт лид в Битриксе, спамить им нельзя.
    const rl = hit(key("orders", clientIp(req), session?.sub), ORDER_LIMIT, ORDER_WINDOW_SEC);
    if (!rl.ok) {
      // Формат ответа тот же, что у лимита на /auth/*: 429, без code, с Retry-After.
      const minutes = Math.max(1, Math.ceil(rl.retryAfterSec / 60));
      const res = apiError(`Слишком много заказов. Повторите через ${minutes} мин.`, 429);
      res.headers.set("Retry-After", String(rl.retryAfterSec));
      return res;
    }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }
    const data = parsed.data;
    const crmProvider = selectedCrmProvider();

    // Адрес из книги имеет приоритет над плоской строкой: id проверяем по владельцу,
    // строку собираем на сервере — клиент не может подменить чужой адрес.
    let address = data.address || null;
    if (data.addressId) {
      if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
      const saved = await prisma.customerAddress.findFirst({
        where: { id: data.addressId, customerId: session.sub },
      });
      if (!saved) return apiError("Адрес не найден", 404, "NOT_FOUND");
      address = formatAddressLine(saved);
    }

    const requestHash = createHash("sha256").update(JSON.stringify({ ...data, customerId: session?.sub ?? null })).digest("hex");
    const existing = await prisma.order.findUnique({ where: { clientRequestKey: data.requestKey }, include: { items: true } });
    if (existing) {
      if (existing.requestHash !== requestHash) return apiError("Этот запрос уже использован для другого заказа", 409, "CONFLICT");
      return apiOk(serializeOrder(existing));
    }
    const ids = data.items.map(i => i.id);
    if (new Set(ids).size !== ids.length) return apiError("Товар повторяется в заказе", 400, "VALIDATION");
    const result = await prisma.$transaction(async tx => {
      // Stable row-lock order serializes stock/price updates across website and app.
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id IN (${Prisma.join([...ids].sort())}) ORDER BY id FOR UPDATE`;
      const replay = await tx.order.findUnique({ where: { clientRequestKey: data.requestKey }, include: { items: true } });
      if (replay) {
        if (replay.requestHash !== requestHash) throw new OrderInputError("Этот запрос уже использован для другого заказа", "CONFLICT");
        return { order: replay, created: false };
      }
      const products = await tx.product.findMany({ where: { id: { in: ids } } });
      const byId = new Map(products.map(p => [p.id, p]));
      const items = data.items.map(i => {
        const p = byId.get(i.id);
        if (!p || !p.isActive || !p.inStock || (p.stockQty !== null && p.stockQty < i.qty)) {
          throw new OrderInputError("Часть товаров недоступна в нужном количестве. Проверьте корзину.", "CART_CHANGED");
        }
        return { productId: p.id, name: p.name, priceKopecks: p.priceKopecks, qty: i.qty, stockReserved: p.stockQty === null ? 0 : i.qty };
      });
      const totalKopecks = items.reduce((sum, i) => sum + i.priceKopecks * i.qty, 0);
      if (totalKopecks > 2147483647 || totalKopecks !== data.expectedTotalKopecks) {
        throw new OrderInputError("Цена товаров изменилась. Проверьте новую сумму и подтвердите заказ ещё раз.", "PRICE_CHANGED");
      }
      for (const item of items) {
        if (byId.get(item.productId)!.stockQty === null) continue;
        await tx.product.update({ where: { id: item.productId }, data: { stockQty: { decrement: item.qty } } });
        await tx.product.updateMany({ where: { id: item.productId, stockQty: 0 }, data: { inStock: false } });
      }
      const created = await tx.order.create({ data: {
        crmProvider,
        ...(crmProvider === "HAYAT" ? { bitrixSyncStatus: "DISABLED" as const } : {}),
        customerName: data.customerName.trim(), phone: data.phone.trim(), email: data.email || null,
        address, comment: data.comment || null, totalKopecks, consentGiven: true, consentAt: new Date(),
        inventoryVersion: 1,
        source: "Мобильное приложение", customerId: session?.sub ?? null,
        clientRequestKey: data.requestKey, requestHash, items: { create: items },
      }, include: { items: true } });
      if (crmProvider === "HAYAT") await enqueueCrmEvent(tx, retailEvent(created, "api_v2"));
      return { order: created, created: true };
    });
    const order = result.order;
    if (result.created) await afterAcceptance("order.catalog", () => revalidateTag("catalog", { expire: 0 }));

    // Лид в Битрикс24 (не блокирует — статус пишется в БД).
    if (result.created) {
      if (order.crmProvider === "HAYAT") await tryDeliverCrmEvent("retail_order", order.id);
      else await afterAcceptance("order.bitrix", () => syncOrderToBitrix(order.id));
    }

    return apiOk(serializeOrder(order), { status: 201 });
  } catch (e) {
    if (e instanceof OrderInputError) return apiError(e.message, 409, e.code);
    // A concurrent retry can lose the unique-key race after stock checks. Its
    // transaction rolls back; the client can safely retry the same request key.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return apiError("Заказ уже обрабатывается. Повторите запрос.", 409, "RETRY_REQUEST");
    return apiInternal("api/v2/orders POST", e);
  }
}

/** GET /api/v2/orders — заказы текущего покупателя (пагинация). */
export async function GET(req: Request) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const url = new URL(req.url);
    const { take, skip } = parsePaging(url, 24, 100);

    const orders = await prisma.order.findMany({
      where: { customerId: session.sub },
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take,
      skip,
    });

    return apiOk(orders.map(serializeOrder));
  } catch (e) {
    return apiInternal("api/v2/orders GET", e);
  }
}

class OrderInputError extends Error { constructor(message: string, public code: string) { super(message); } }
