import { NextResponse, type NextRequest } from "next/server";
import { destroyB2BSession } from "@/lib/b2b-auth";

export async function POST(req: NextRequest) {
  await destroyB2BSession();
  // База редиректа — из env: за реверс-прокси req.url указывает на
  // localhost:3000, и выход «скидывал» бы на localhost. На оптовом домене
  // (NEXT_PUBLIC_OPT_URL) корень "/" сам переписывается в /opt (см. proxy.ts).
  const optUrl = process.env.NEXT_PUBLIC_OPT_URL;
  if (optUrl) return NextResponse.redirect(new URL("/", optUrl));
  const base = process.env.NEXT_PUBLIC_SITE_URL || req.url;
  return NextResponse.redirect(new URL("/opt", base));
}
