import { apiOk, apiPreflight } from "@/lib/api/response";
import { EVIDENCE_COMPONENTS } from "@/lib/compatibility-evidence";
export const dynamic = "force-dynamic";
export function OPTIONS() { return apiPreflight(); }
export function GET() { return apiOk(EVIDENCE_COMPONENTS.map(component => component.name)); }
