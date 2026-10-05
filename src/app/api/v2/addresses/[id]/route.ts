import { writeAddress, AddressError } from "@/lib/customer-addresses";
import { z } from "zod";
import { apiOk, apiError, apiInternal, apiPreflight } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeAddress } from "../_address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/**
 * PATCH частичный: отсутствующий ключ должен остаться undefined (Prisma его пропустит),
 * а явная пустая строка/null — очистить поле. Поэтому undefined тут НЕ схлопывается в null,
 * иначе обновление одного поля стирало бы все остальные.
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v || null));

/**
 * Частичное обновление: поле отсутствует — не трогаем, пришло пустым — очищаем.
 * Поэтому city/street здесь необязательны, но если пришли — не могут быть пустыми.
 */
const patchSchema = z.object({
  label: optionalText(60),
  recipient: optionalText(120),
  phone: optionalText(40),
  city: z.string().trim().min(1).max(120).optional(),
  street: z.string().trim().min(1).max(200).optional(),
  house: optionalText(30),
  apartment: optionalText(30),
  comment: optionalText(500),
  isDefault: z.boolean().optional(),
});

/** PATCH /api/v2/addresses/[id] — изменить свой адрес. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const { id } = await params;
    // Чужой адрес — тоже 404: существование чужого id наружу не раскрываем.
    const own = await prisma.customerAddress.findFirst({
      where: { id, customerId: session.sub },
      select: { id: true },
    });
    if (!own) return apiError("Адрес не найден", 404, "NOT_FOUND");

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiError("Проверьте данные", 400, "VALIDATION");

    const address = await writeAddress(session.sub, "update", parsed.data, id);
    return apiOk(serializeAddress(address!));
  } catch (e) {
    if (e instanceof AddressError) return apiError(e.message, 404, "NOT_FOUND");
    return apiInternal("api/v2/addresses/[id] PATCH", e);
  }
}

/** DELETE /api/v2/addresses/[id] — удалить свой адрес. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const { id } = await params;
    const own = await prisma.customerAddress.findFirst({
      where: { id, customerId: session.sub },
      select: { id: true, isDefault: true },
    });
    if (!own) return apiError("Адрес не найден", 404, "NOT_FOUND");

    await writeAddress(session.sub, "delete", {}, id);
    return apiOk({ ok: true });
  } catch (e) {
    if (e instanceof AddressError) return apiError(e.message, 404, "NOT_FOUND");
    return apiInternal("api/v2/addresses/[id] DELETE", e);
  }
}
