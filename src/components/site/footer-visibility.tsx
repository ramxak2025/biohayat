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
  const inAccount = pathname === "/account" || pathname.startsWith("/account/");
  return <div className={cn(inAccount && "max-lg:hidden")}>{children}</div>;
}
