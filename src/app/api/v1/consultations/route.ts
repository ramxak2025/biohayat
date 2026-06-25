import { z } from "zod";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { requireApiCustomer, ApiAuthError } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeConsultation } from "@/lib/api/serializers";
import { syncConsultationToBitrix } from "@/lib/bitrix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

const schema = z.object({
  topic: z.string().max(200).optional(),
  message: z.string().min(1).max(2000),
  name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
});

/** POST /api/v1/consultations — заявка на консультацию нутрициолога. */
export async function POST(req: Request) {
  try {
    const session = await requireApiCustomer(req);
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }
    const data = parsed.data;

    const consultation = await prisma.consultationRequest.create({
      data: {
        customerId: session.sub,
        name: data.name?.trim() || session.name,
        phone: data.phone?.trim() || session.phone,
        topic: data.topic?.trim() || null,
        message: data.message.trim(),
      },
    });

    // Лид в Битрикс24 (не блокирует — статус пишется в БД).
    await syncConsultationToBitrix(consultation.id);

    const fresh = await prisma.consultationRequest.findUnique({ where: { id: consultation.id } });
    return apiOk(serializeConsultation(fresh ?? consultation), { status: 201 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}

/** GET /api/v1/consultations — заявки текущего покупателя. */
export async function GET(req: Request) {
  try {
    const session = await requireApiCustomer(req);
    const consultations = await prisma.consultationRequest.findMany({
      where: { customerId: session.sub },
      orderBy: { createdAt: "desc" },
    });
    return apiOk(consultations.map(serializeConsultation));
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
