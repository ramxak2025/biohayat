import { NextResponse, type NextRequest } from "next/server";
import { cookieSecure } from "@/lib/cookie-secure";
import { jwtVerify } from "jose";

const COOKIE_NAME = "hayat_session";

async function sessionPayload(token: string | undefined): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

const CUSTOMER_COOKIE = "hayat_customer";
const AUTH_FLAG_COOKIE = "hayat_auth";

/**
 * Безопасный относительный путь для редиректа: только внутренние пути.
 * Отсекаем открытый редирект — путь должен начинаться с одного "/",
 * но не с "//" (protocol-relative) и не содержать обратный слеш.
 */
function safeNextPath(path: string | null | undefined, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }
  return path;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ЛК покупателя: мостик для сессий, созданных до появления клиентского
  // флага hayat_auth — проставляем его, чтобы шапка/избранное видели вход.
  if (pathname.startsWith("/account")) {
    if (!req.cookies.get(AUTH_FLAG_COOKIE)?.value) {
      const customerToken = req.cookies.get(CUSTOMER_COOKIE)?.value;
      const payload = await sessionPayload(customerToken);
      if (payload) {
        const res = NextResponse.next();
        const opts = {
          path: "/",
          sameSite: "lax" as const,
          secure: cookieSecure(),
          maxAge: 60 * 60 * 24 * 30,
        };
        res.cookies.set(AUTH_FLAG_COOKIE, "1", opts);
        if (typeof payload.name === "string" && payload.name) {
          res.cookies.set("hayat_uname", payload.name, opts);
        }
        return res;
      }
    }
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const valid = await isValidSession(token);

  // Страница входа: если уже авторизован — на дашборд.
  if (pathname === "/admin/login") {
    if (valid) return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.next();
  }

  // Остальные /admin/* требуют авторизации.
  if (!valid) {
    const url = new URL("/admin/login", req.url);
    // pathname всегда внутренний, но прогоняем через safeNextPath на случай
    // экзотических значений — открытый редирект исключён на стороне логина.
    url.searchParams.set("next", safeNextPath(pathname, "/admin"));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
