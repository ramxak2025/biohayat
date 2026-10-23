import { z } from "zod";
import { apiOk, apiError, apiInternal, apiPreflight } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { applyTrackerOperation, operationSchema, TrackerError } from "@/lib/tracker-service";
export const dynamic = "force-dynamic";
export function OPTIONS() { return apiPreflight(); }
const schema = z.object({ operation: operationSchema, timeZone: z.string().min(1).max(64) }).strict();
export async function POST(req: Request) {
  try {
    const actor = await getApiCustomer(req);
    if (!actor) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) return apiError("Проверьте данные изменения", 400, "VALIDATION");
    return apiOk(await applyTrackerOperation(actor.sub, body.data.operation, body.data.timeZone));
  } catch (error) { if (error instanceof TrackerError) return apiError(error.message, error.status, error.code); return apiInternal("tracker/operations", error); }
}
