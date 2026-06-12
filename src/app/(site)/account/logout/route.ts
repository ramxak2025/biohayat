import { NextResponse, type NextRequest } from "next/server";
import { destroyCustomerSession } from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  await destroyCustomerSession();
  // База редиректа — из NEXT_PUBLIC_SITE_URL: за реверс-прокси req.url
  // указывает на localhost:3000, и выход «скидывал» на localhost.
  const base = process.env.NEXT_PUBLIC_SITE_URL || req.url;
  return NextResponse.redirect(new URL("/account", base));
}
