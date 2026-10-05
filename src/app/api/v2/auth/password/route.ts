import bcrypt from "bcryptjs";
import { z } from "zod";
import { apiOk, apiError, apiPreflight, apiInternal } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getActiveCustomer } from "../_lib/session";
import { throttle, release } from "../_lib/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

const schema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

/**
 * PATCH /api/v2/auth/password — смена пароля.
 *
 * Правила один в один с сайтом (`changePassword` в
 * src/app/(site)/account/actions.ts): старый пароль проверяется bcrypt'ом,
 * новый — не короче 6 символов, хеш с cost 12.
 *
 * Токен после смены пароля остаётся действительным: отзывать JWT нечем
 * (модели RefreshToken нет). Это известное ограничение, см. docs/api.md.
 */
export async function PATCH(req: Request) {
  try {
    const customer = await getActiveCustomer(req);
    if (!customer) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Новый пароль не короче 6 символов", 400, "VALIDATION");
    }

    // Подбор старого пароля украденным токеном — это и обход подтверждения,
    // и 250 мс CPU на попытку, поэтому лимит тот же, что и на входе.
    const limit = throttle("password", [`customer:${customer.id}`]);
    if (limit.limited) return limit.limited;

    const ok = await bcrypt.compare(parsed.data.oldPassword, customer.passwordHash);
    if (!ok) {
      return apiError("Текущий пароль указан неверно", 403, "FORBIDDEN");
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
    });

    release(limit.keys);
    return apiOk({ ok: true });
  } catch (e) {
    return apiInternal("api/v2/auth/password", e);
  }
}
