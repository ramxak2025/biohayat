import { apiOk, apiPreflight } from "@/lib/api/response";
import { COMPATIBILITY_EVIDENCE } from "@/lib/compatibility-evidence";
export const dynamic = "force-dynamic";
export function OPTIONS() { return apiPreflight(); }
export function GET() { return apiOk(COMPATIBILITY_EVIDENCE); }
