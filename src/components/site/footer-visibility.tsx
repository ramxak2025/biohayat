"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * В личном кабинете на мобильном футер не показываем — ЛК должен ощущаться
 * как нативное приложение (контент + нижний бар, без «сайтового» хвоста).
 * На десктопе футер остаётся везде.
 */
export function FooterVisibility({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // ЛК, корзина и оформление — «приложенческие» экраны: без футера на мобильном
  const appLike =
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/cart" ||
    pathname === "/checkout";
  return <div className={cn(appLike && "max-lg:hidden")}>{children}</div>;
}
