import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { apiOk, apiError, apiPreflight, apiInternal } from "@/lib/api/response";
import { serializeCustomer } from "@/lib/api/customer";
import { prisma } from "@/lib/prisma";
import { getActiveCustomer } from "../_lib/session";
import { throttle } from "../_lib/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v2/auth/me — профиль текущего покупателя. */
export async function GET(req: Request) {
  try {
    // 401, а не 404: заблокированный и удалённый покупатель для клиента —
    // то же самое, что протухший токен, приложение должно разлогиниться.
    const customer = await getActiveCustomer(req);
    if (!customer) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    return apiOk(serializeCustomer(customer));
  } catch (e) {
    return apiInternal("api/v2/auth/me", e);
  }
}

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
});

/** PATCH /api/v2/auth/me — обновление профиля. */
export async function PATCH(req: Request) {
  try {
    const customer = await getActiveCustomer(req);
    if (!customer) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    const data: { name?: string; email?: string | null; city?: string | null } = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.email !== undefined) data.email = parsed.data.email || null;
    if (parsed.data.city !== undefined) data.city = parsed.data.city || null;

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data,
    });
    return apiOk(serializeCustomer(updated));
  } catch (e) {
    return apiInternal("api/v2/auth/me", e);
  }
}

const deleteSchema = z.object({
  password: z.string().min(1),
});

/**
 * DELETE /api/v2/auth/me — удаление аккаунта (App Store Guideline 5.1.1(v)).
 *
 * Удаление мягкое и осознанно асимметричное:
 *  • личные данные обезличиваются, а списки (избранное, устройства, планы
 *    приёма вместе с логами, адреса) удаляются физически;
 *  • заказы и заявки на консультацию ОСТАЮТСЯ — они нужны бухгалтерии и уже
 *    хранят снимок имени/телефона на момент оформления, — но `customerId`
 *    обнуляется, и связи с человеком больше нет;
 *  • телефон освобождается (`deleted:<id>`), чтобы по нему можно было
 *    зарегистрироваться заново: уникальный индекс перестаёт его держать.
 *
 * Всё одной транзакцией: наполовину удалённый аккаунт (личные данные стёрты,
 * а войти всё ещё можно) — худший исход, чем неудача целиком.
 */
export async function DELETE(req: Request) {
  try {
    const customer = await getActiveCustomer(req);
    if (!customer) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const body = await req.json().catch(() => null);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Введите пароль для подтверждения", 400, "VALIDATION");
    }

    // Тот же лимит, что на входе: подтверждение паролем — это снова bcrypt(12),
    // и подбирать его украденным токеном через удаление аккаунта нельзя.
    const limit = throttle("delete-account", [`customer:${customer.id}`]);
    if (limit.limited) return limit.limited;

    const ok = await bcrypt.compare(parsed.data.password, customer.passwordHash);
    if (!ok) {
      return apiError("Неверный пароль", 403, "FORBIDDEN");
    }

    // Хеш считаем заранее: bcrypt(12) — это ~250 мс, внутри транзакции такое
    // время держать соединение незачем.
    const deadHash = await bcrypt.hash(randomUUID(), 12);
    const id = customer.id;

    await prisma.$transaction([
      prisma.order.updateMany({ where: { customerId: id }, data: { customerId: null } }),
      prisma.consultationRequest.updateMany({
        where: { customerId: id },
        data: { customerId: null },
      }),
      prisma.favorite.deleteMany({ where: { customerId: id } }),
      prisma.device.deleteMany({ where: { customerId: id } }),
      prisma.customerAddress.deleteMany({ where: { customerId: id } }),
      // IntakeLog уходит каскадом по planId.
      prisma.intakePlan.deleteMany({ where: { customerId: id } }),
      prisma.customer.update({
        where: { id },
        data: {
          isActive: false,
          phone: `deleted:${id}`,
          // name в схеме не nullable — вместо null ставим заглушку.
          name: "Удалённый аккаунт",
          email: null,
          city: null,
          deletedAt: new Date(),
          // Пароль затираем: даже если аккаунт когда-нибудь реактивируют
          // руками, старый пароль к нему не подойдёт.
          passwordHash: deadHash,
        },
      }),
    ]);

    return apiOk({ ok: true });
  } catch (e) {
    return apiInternal("api/v2/auth/me", e);
  }
}
