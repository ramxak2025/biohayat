import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { deliverCrmEvent, retryDelayMs, type CrmEvent } from "./crm-transport";

const LEASE_MS = 90_000;

/** Call inside the source transaction; failure must roll back acceptance. */
export async function enqueueCrmEvent(tx: Prisma.TransactionClient, event: CrmEvent): Promise<void> {
  await tx.crmOutbox.create({ data: {
    provider: "HAYAT", kind: event.kind, externalId: event.externalId, payload: JSON.stringify(event),
  } });
}

async function claimDelivery(identity?: { kind: string; externalId: string }) {
  return prisma.$transaction(async tx => {
    const filter = identity ? Prisma.sql`AND kind = ${identity.kind} AND "externalId" = ${identity.externalId}` : Prisma.empty;
    const rows = await tx.$queryRaw<{ id: string; claimedAt: Date }[]>(Prisma.sql`
      SELECT id, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AS "claimedAt" FROM "CrmOutbox"
      WHERE provider = 'HAYAT' AND (
        (status IN ('PENDING', 'RETRY') AND "nextAttemptAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) OR
        (status = 'PROCESSING' AND "leaseExpiresAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
      ) ${filter}
      ORDER BY "nextAttemptAt", "createdAt", id
      LIMIT 1 FOR UPDATE SKIP LOCKED
    `);
    const row = rows[0];
    if (!row) return null;
    return tx.crmOutbox.update({ where: { id: row.id }, data: {
      status: "PROCESSING", leaseToken: randomUUID(),
      leaseExpiresAt: new Date(row.claimedAt.getTime() + LEASE_MS), attempts: { increment: 1 },
    } });
  });
}

export async function deliverNextCrmEvent(identity?: { kind: string; externalId: string }): Promise<boolean> {
  const job = await claimDelivery(identity);
  if (!job) return false;
  const result = await deliverCrmEvent("biohayat", job.payload, job);
  // Fencing: an old worker cannot overwrite a receipt or a newer worker's state.
  await prisma.crmOutbox.updateMany({
    where: { id: job.id, status: "PROCESSING", leaseToken: job.leaseToken },
    data: result.ok ? {
      status: "DELIVERED", crmDealId: result.dealId, deliveredAt: new Date(), lastError: null,
      leaseToken: null, leaseExpiresAt: null,
    } : {
      status: result.retryable ? "RETRY" : "FAILED", lastError: result.error,
      nextAttemptAt: new Date(Date.now() + retryDelayMs(job.attempts)),
      leaseToken: null, leaseExpiresAt: null,
    },
  });
  return true;
}

/** Accepted records stay successful even if delivery or its receipt write fails. */
export async function tryDeliverCrmEvent(kind: CrmEvent["kind"], externalId: string): Promise<void> {
  try {
    await deliverNextCrmEvent({ kind, externalId });
  } catch {
    console.error("[crm-outbox] Delivery deferred; durable job retained", { kind, externalId });
  }
}

export async function retryCrmDelivery(id: string): Promise<void> {
  // Does not steal a live lease or reopen an acknowledged event.
  const updated = await prisma.crmOutbox.updateMany({
    where: { id, provider: "HAYAT", OR: [
      { status: { in: ["PENDING", "RETRY", "FAILED"] } },
      { status: "PROCESSING", leaseExpiresAt: { lte: new Date() } },
    ] },
    data: { status: "PENDING", nextAttemptAt: new Date(), leaseToken: null, leaseExpiresAt: null },
  });
  if (!updated.count) return;
  const job = await prisma.crmOutbox.findUniqueOrThrow({ where: { id } });
  await deliverNextCrmEvent({ kind: job.kind, externalId: job.externalId });
}
