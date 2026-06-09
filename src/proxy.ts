import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "hayat_session";

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

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ЛК покупателя: мостик для сессий, созданных до появления клиентского
  // флага hayat_auth — проставляем его, чтобы шапка/избранное видели вход.
  if (pathname.startsWith("/account")) {
    if (!req.cookies.get(AUTH_FLAG_COOKIE)?.value) {
      const customerToken = req.cookies.get(CUSTOMER_COOKIE)?.value;
      if (customerToken && (await isValidSession(customerToken))) {
        const res = NextResponse.next();
        res.cookies.set(AUTH_FLAG_COOKIE, "1", {
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 30,
        });
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
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
