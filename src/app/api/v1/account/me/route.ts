// GET /api/v1/account/me — профиль покупателя (требует Bearer-токен).

import { type NextRequest } from "next/server";
import { apiOk, apiError, withErrorHandling } from "../../_lib/response";
import { requireActiveCustomer, toPublicCustomer } from "../../_lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const customer = await requireActiveCustomer(req);
  if (!customer) return apiError(401, "UNAUTHORIZED", "Требуется авторизация");

  return apiOk(toPublicCustomer(customer));
});
