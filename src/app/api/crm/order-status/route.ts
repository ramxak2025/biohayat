import { revalidateTag } from "next/cache";
import {
  applyCrmStatusCommand, authorizeCrmStatus, CrmStatusError, crmOrderIdentitySchema,
  crmStatusCommandSchema, getCrmOrderState,
} from "@/lib/crm-order-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
function failure(error: unknown) {
  if (error instanceof CrmStatusError) return json({ code: error.code }, error.httpStatus);
  // Database errors can contain order/contact data; never return or log them here.
  return json({ code: "status_unavailable" }, 503);
}

export async function GET(request: Request) {
  try {
    authorizeCrmStatus(request);
    const parsed = crmOrderIdentitySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return json({ code: "invalid_identity" }, 400);
    return json(await getCrmOrderState(parsed.data));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    authorizeCrmStatus(request);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ code: "invalid_content_type" }, 415);
    const reader = request.body?.getReader();
    if (!reader) return json({ code: "invalid_command" }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > 16_384) { await reader.cancel(); return json({ code: "body_too_large" }, 413); }
      chunks.push(part.value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return json({ code: "invalid_json" }, 400); }
    const parsed = crmStatusCommandSchema.safeParse(body);
    if (!parsed.success) return json({ code: "invalid_command" }, 400);
    const result = await applyCrmStatusCommand(parsed.data);
    if (result.applied && result.kind === "retail_order" && result.status === "CANCELLED") revalidateTag("catalog", { expire: 0 });
    return json(result, result.applied ? 200 : 409);
  } catch (error) { return failure(error); }
}
