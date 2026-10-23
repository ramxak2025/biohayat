import { apiOk, apiError, apiInternal, apiPreflight } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { snapshotSchema, trackerSnapshot, TrackerError } from "@/lib/tracker-service";
export const dynamic = "force-dynamic";
export function OPTIONS() { return apiPreflight(); }
export async function POST(req: Request) {
  try {
    const actor = await getApiCustomer(req);
    if (!actor) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    const body = snapshotSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) return apiError("Проверьте период и часовой пояс", 400, "VALIDATION");
    return apiOk(await trackerSnapshot(actor.sub, body.data));
  } catch (error) { if (error instanceof TrackerError) return apiError(error.message, error.status, error.code); return apiInternal("tracker/snapshot", error); }
}
