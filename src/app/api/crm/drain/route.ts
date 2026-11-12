import { NextResponse } from "next/server";
import { deliverNextCrmEvent } from "@/lib/crm-outbox";
import { validBearer } from "@/lib/crm-transport";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const token = process.env.CRM_DRAIN_TOKEN?.trim();
  if (!token || token.length < 32) return NextResponse.json({ ok: false, error: "drain_not_configured" }, { status: 503 });
  if (!validBearer(request.headers.get("authorization"), token)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const deadline = Date.now() + 45_000;
    let attempted = 0;
    while (attempted < 10 && Date.now() < deadline && await deliverNextCrmEvent()) attempted++;
    const [pending, failed] = await Promise.all([
      prisma.crmOutbox.count({ where: { status: { in: ["PENDING", "RETRY", "PROCESSING"] } } }),
      prisma.crmOutbox.count({ where: { status: "FAILED" } }),
    ]);
    return NextResponse.json({ ok: true, attempted, pending, failed });
  } catch {
    return NextResponse.json({ ok: false, error: "queue_unavailable" }, { status: 503 });
  }
}
