import { type NextRequest } from "next/server";
import { loginCustomer } from "@/lib/customer-auth";
import { authRateLimited } from "@/lib/auth-throttle";
import { handleFormPost, redirectAfterPost } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Вход обычной отправкой формы (без серверного экшена).
 *
 * Почему так: форма входа и сам кабинет — это один адрес /account. Раньше вход
 * делался серверным экшеном, а состояние формы жило в клиентском React. Ссылки
 * «Кабинет» в шапке и нижнем меню ведут на /account, поэтому роутер заранее
 * подгружал (prefetch) гостевую версию этой же страницы; прилетевший ответ
 * пересоздавал компонент формы, результат экшена терялся — и вход выглядел как
 * «ничего не произошло». Обычный POST с ответом 303 таких гонок не имеет:
 * браузер делает полноценный переход и получает страницу, отрисованную с сессией.
 */
/**
 * Прямой заход по адресу (закладка, «назад», ссылка из письма) — не ошибка.
 * Без этого GET отдавал 405 с системной страницей браузера вместо формы.
 */
export function GET() {
  return redirectAfterPost("/account");
}

export async function POST(req: NextRequest) {
  return handleFormPost("account/login", "/account?error=server", async () => {
    const fd = await req.formData();
    const phone = String(fd.get("phone") || "");
    const password = String(fd.get("password") || "");

    const waitMin = await authRateLimited("login", phone);
    if (waitMin) return redirectAfterPost(`/account?error=rate_limit&min=${waitMin}`);

    const res = await loginCustomer(phone, password);
    if (res.ok) return redirectAfterPost("/account");

    // В адрес попадает только код ошибки: телефон — персональные данные, им не
    // место в истории браузера и логах веб-сервера.
    return redirectAfterPost(`/account?error=${res.code}`);
  });
}
