import { z } from "zod";
import { apiOk, apiError, apiPreflight, parsePaging } from "@/lib/api/response";
import { getApiCustomer, requireApiCustomer, ApiAuthError } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeOrder } from "@/lib/api/serializers";
import { syncOrderToBitrix } from "@/lib/bitrix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

const schema = z.object({
  customerName: z.string().min(2).max(120),
  phone: z.string().min(10).regex(/[\d+()\-\s]{10,}/),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  comment: z.string().max(1000).optional().or(z.literal("")),
  consent: z.literal(true),
  items: z.array(z.object({ id: z.string(), qty: z.number().int().min(1).max(99) })).min(1),
});

/** POST /api/v1/orders — оформление заказа (опциональная авторизация). */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }
    const data = parsed.data;

    // Перепроверяем по БД: только активные товары в наличии, цена из БД.
    const products = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.id) }, isActive: true, inStock: true },
      select: { id: true, name: true, priceKopecks: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const items = data.items
      .map((i) => {
        const p = byId.get(i.id);
        if (!p) return null;
        return { productId: p.id, name: p.name, priceKopecks: p.priceKopecks, qty: i.qty };
      })
      .filter((i): i is NonNullable<typeof i> => i != null);

    if (items.length === 0) {
      return apiError("Нет доступных товаров для заказа", 400, "VALIDATION");
    }

    const totalKopecks = items.reduce((s, i) => s + i.priceKopecks * i.qty, 0);

    const session = await getApiCustomer(req);

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
        source: "Мобильное приложение",
        customerId: session?.sub ?? null,
        items: { create: items },
      },
      include: { items: true },
    });

    // Лид в Битрикс24 (не блокирует — статус пишется в БД).
    await syncOrderToBitrix(order.id);

    return apiOk(serializeOrder(order), { status: 201 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}

/** GET /api/v1/orders — заказы текущего покупателя (пагинация). */
export async function GET(req: Request) {
  try {
    const session = await requireApiCustomer(req);
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
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
