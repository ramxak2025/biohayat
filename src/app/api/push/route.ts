// POST /api/push — сохранить push-подписку текущего покупателя (upsert по endpoint).
// DELETE /api/push — удалить подписку по endpoint (отписка).

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubscriptionBody {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
}

export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let body: SubscriptionBody;
  try {
    body = (await req.json()) as SubscriptionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_JSON" }, { status: 400 });
  }

  const sub = body.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ ok: false, error: "BAD_SUBSCRIPTION" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { customerId: session.sub, endpoint, p256dh, auth },
    update: { customerId: session.sub, p256dh, auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let endpoint: string | undefined;
  try {
    const body = (await req.json()) as { endpoint?: string };
    endpoint = body.endpoint;
  } catch {
    /* ignore */
  }
  if (!endpoint) return NextResponse.json({ ok: false, error: "NO_ENDPOINT" }, { status: 400 });

  // Удаляем только свою подписку.
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, customerId: session.sub },
  });

  return NextResponse.json({ ok: true });
}
