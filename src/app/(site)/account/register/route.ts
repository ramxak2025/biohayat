import { type NextRequest } from "next/server";
import { registerCustomer } from "@/lib/customer-auth";
import { handleFormPost, redirectAfterPost } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Регистрация обычной отправкой формы — см. пояснение в ../login/route.ts. */
export async function POST(req: NextRequest) {
  return handleFormPost(
    "account/register",
    "/account?tab=register&error=server",
    async () => {
      const fd = await req.formData();
      const name = String(fd.get("name") || "").trim();
      const phone = String(fd.get("phone") || "");
      const password = String(fd.get("password") || "");
      const email = String(fd.get("email") || "").trim();
      const consent = fd.get("consent") === "on";

      // В адрес попадает только код ошибки и вкладка: имя, телефон и e-mail —
      // персональные данные, им не место в истории браузера и логах веб-сервера.
      const fail = (code: string) =>
        redirectAfterPost(`/account?tab=register&error=${code}`);

      if (name.length < 2) return fail("no_name");
      if (!consent) return fail("no_consent");

      const res = await registerCustomer({ name, phone, password, email });
      if (!res.ok) return fail(res.code);

      return redirectAfterPost("/account");
    },
  );
}
