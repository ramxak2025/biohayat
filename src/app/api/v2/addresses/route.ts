import { writeAddress, AddressError } from "@/lib/customer-addresses";
import { z } from "zod";
import { apiOk, apiError, apiInternal, apiPreflight } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeAddress } from "./_address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** Пустая строка в необязательном поле = «очистить», поэтому приводим к null. */
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

const createSchema = z.object({
  label: optionalText(60),
  recipient: optionalText(120),
  phone: optionalText(40),
  city: z.string().trim().min(1).max(120),
  street: z.string().trim().min(1).max(200),
  house: optionalText(30),
  apartment: optionalText(30),
  comment: optionalText(500),
  isDefault: z.boolean().optional(),
});

/** GET /api/v2/addresses — адресная книга покупателя, по умолчанию — первым. */
export async function GET(req: Request) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const addresses = await prisma.customerAddress.findMany({
      where: { customerId: session.sub },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return apiOk(addresses.map(serializeAddress));
  } catch (e) {
    if (e instanceof AddressError) return apiError(e.message, 400, "VALIDATION");
    return apiInternal("api/v2/addresses GET", e);
  }
}

/** POST /api/v2/addresses — новый адрес. Первый адрес всегда становится основным. */
export async function POST(req: Request) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError("Проверьте данные", 400, "VALIDATION");
    const address = await writeAddress(session.sub, "create", parsed.data);
    return apiOk(serializeAddress(address!), { status: 201 });
  } catch (e) {
    if (e instanceof AddressError) return apiError(e.message, 400, "VALIDATION");
    return apiInternal("api/v2/addresses POST", e);
  }
}
