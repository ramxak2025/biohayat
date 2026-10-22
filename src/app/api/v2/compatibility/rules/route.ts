import { apiOk, apiPreflight } from "@/lib/api/response";
import { EVIDENCE_RULES } from "@/lib/compatibility-evidence";
export const dynamic = "force-dynamic";
export function OPTIONS() { return apiPreflight(); }
/** Compatibility adapter for older clients; unreviewed admin drafts are never served. */
export function GET() { return apiOk(EVIDENCE_RULES); }
