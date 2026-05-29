import { NextResponse, type NextRequest } from "next/server";
import { destroyCustomerSession } from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  await destroyCustomerSession();
  return NextResponse.redirect(new URL("/account", req.url));
}
