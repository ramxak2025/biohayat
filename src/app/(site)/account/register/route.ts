import { type NextRequest } from "next/server";
import { registerCustomer } from "@/lib/customer-auth";
import { authRateLimited } from "@/lib/auth-throttle";
import { applyReferral } from "@/lib/referral";
import { handleFormPost, redirectAfterPost } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Прямой заход по адресу — на форму регистрации, а не 405. */
export function GET() {
  return redirectAfterPost("/account?tab=register");
}

/** Регистрация обычной отправкой формы — см. пояснение в ../login/route.ts. */
export async function POST(req: NextRequest) {
  return handleFormPost("account/register", "/account?tab=register&error=server", async () => {
    const fd = await req.formData();
    const name = String(fd.get("name") || "").trim();
    const phone = String(fd.get("phone") || "");
    const password = String(fd.get("password") || "");
    const email = String(fd.get("email") || "");
    const consent = fd.get("consent") === "on";

    // В адрес попадает только код ошибки и вкладка: имя, телефон и e-mail —
    // персональные данные, им не место в истории браузера и логах веб-сервера.
    const fail = (code: string) => redirectAfterPost(`/account?tab=register&error=${code}`);

    if (name.length < 2) return fail("no_name");
    if (!consent) return fail("no_consent");

    const waitMin = await authRateLimited("register", phone);
    if (waitMin) {
      return redirectAfterPost(`/account?tab=register&error=rate_limit&min=${waitMin}`);
    }

    const res = await registerCustomer({ name, phone, password, email });
    if (!res.ok) return fail(res.code);

    // Привязка по реферальному коду из ссылки (?ref=) — без срыва регистрации.
    const ref = String(fd.get("ref") || "").trim();
    if (ref && res.customerId) {
      await applyReferral(res.customerId, ref).catch(() => {});
    }

    return redirectAfterPost("/account");
  });
}
