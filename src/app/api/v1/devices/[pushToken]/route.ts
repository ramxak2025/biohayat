import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { requireApiCustomer, ApiAuthError } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** DELETE /api/v1/devices/[pushToken] — снять устройство с push-уведомлений. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ pushToken: string }> },
) {
  try {
    const session = await requireApiCustomer(req);
    const { pushToken } = await params;
    const token = decodeURIComponent(pushToken);

    await prisma.device.deleteMany({
      where: { customerId: session.sub, pushToken: token },
    });

    return apiOk({ ok: true });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
