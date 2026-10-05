import { writeAddress, AddressError } from "@/lib/customer-addresses";
import { apiOk, apiError, apiInternal, apiPreflight } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeAddress } from "../../_address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** POST /api/v2/addresses/[id]/default — сделать адрес основным. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const { id } = await params;
    const own = await prisma.customerAddress.findFirst({
      where: { id, customerId: session.sub },
      select: { id: true },
    });
    if (!own) return apiError("Адрес не найден", 404, "NOT_FOUND");

    // Снятие старого флага и установка нового — одной транзакцией,
    // иначе при сбое покупатель останется без адреса по умолчанию.
    const address = await writeAddress(session.sub, "update", { isDefault: true }, id);

    return apiOk(serializeAddress(address!));
  } catch (e) {
    if (e instanceof AddressError) return apiError(e.message, 404, "NOT_FOUND");
    return apiInternal("api/v2/addresses/[id]/default POST", e);
  }
}
