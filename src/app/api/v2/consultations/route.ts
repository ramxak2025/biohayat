import { z } from "zod";
import { apiOk, apiError, apiInternal, apiPreflight } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeConsultation } from "@/lib/api/serializers";
import { syncConsultationToBitrix } from "@/lib/bitrix";
import { hit, clientIp, key } from "@/lib/api/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** Заявка на консультацию: 10 штук за 10 минут на связку IP + покупатель. */
const CONSULT_LIMIT = 10;
const CONSULT_WINDOW_SEC = 10 * 60;

const schema = z.object({
  topic: z.string().max(200).optional(),
  message: z.string().min(1).max(2000),
  name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
});

/** POST /api/v2/consultations — заявка на консультацию нутрициолога. */
export async function POST(req: Request) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    // Лимит до разбора тела: каждая заявка создаёт лид в Битриксе.
    const rl = hit(key("consultations", clientIp(req), session.sub), CONSULT_LIMIT, CONSULT_WINDOW_SEC);
    if (!rl.ok) {
      // Формат ответа тот же, что у лимита на /auth/*: 429, без code, с Retry-After.
      const minutes = Math.max(1, Math.ceil(rl.retryAfterSec / 60));
      const res = apiError(`Слишком много заявок. Повторите через ${minutes} мин.`, 429);
      res.headers.set("Retry-After", String(rl.retryAfterSec));
      return res;
    }

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
  } catch (e) {
    return apiInternal("api/v2/consultations POST", e);
  }
}

/** GET /api/v2/consultations — заявки текущего покупателя. */
export async function GET(req: Request) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const consultations = await prisma.consultationRequest.findMany({
      where: { customerId: session.sub },
      orderBy: { createdAt: "desc" },
    });
    return apiOk(consultations.map(serializeConsultation));
  } catch (e) {
    return apiInternal("api/v2/consultations GET", e);
  }
}
