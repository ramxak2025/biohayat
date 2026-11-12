import { createHash, timingSafeEqual } from "node:crypto";
import { OrderStatus, WholesaleOrderStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./prisma";
import { accrueOrderBonus, PAID_STATUSES, revertOrderBonusOnCancel } from "./bonus";
import { restoreReservedStock } from "./order-inventory";

export const crmOrderIdentitySchema = z.strictObject({
  kind: z.enum(["retail_order", "wholesale_order"]),
  orderId: z.string().min(1).max(200), dealId: z.uuid(),
});
export const crmStatusCommandSchema = crmOrderIdentitySchema.extend({
  schemaVersion: z.literal(1), eventId: z.uuid(), expectedRevision: z.number().int().min(0).max(2_147_483_646),
  status: z.string(),
}).superRefine((command, ctx) => {
  const statuses: readonly string[] = Object.values(command.kind === "retail_order" ? OrderStatus : WholesaleOrderStatus);
  if (!statuses.includes(command.status)) ctx.addIssue({ code: "custom", path: ["status"], message: "Invalid order status" });
});
export type CrmOrderIdentity = z.infer<typeof crmOrderIdentitySchema>;
export type CrmStatusCommand = z.infer<typeof crmStatusCommandSchema>;

export class CrmStatusError extends Error {
  constructor(readonly code: string, readonly httpStatus: number) { super(code); }
}

export function authorizeCrmStatus(request: Request): void {
  const expected = process.env.HAYAT_CRM_STATUS_TOKEN;
  if (!expected || expected.length < 32 || [process.env.AUTH_SECRET, process.env.HAYAT_CRM_TOKEN, process.env.CRM_DRAIN_TOKEN].includes(expected)) {
    throw new CrmStatusError("status_integration_disabled", 503);
  }
  const supplied = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!supplied || supplied.length > 512 || !timingSafeEqual(
    createHash("sha256").update(expected).digest(), createHash("sha256").update(supplied).digest(),
  )) throw new CrmStatusError("unauthorized", 401);
}

async function assertLinked(tx: Prisma.TransactionClient, identity: CrmOrderIdentity) {
  const link = await tx.crmOutbox.findUnique({ where: { kind_externalId: { kind: identity.kind, externalId: identity.orderId } } });
  if (!link || link.provider !== "HAYAT") throw new CrmStatusError("order_not_found", 404);
  // The CRM transaction may commit before the original sender has stored its receipt.
  if (!link.crmDealId) throw new CrmStatusError("ingress_receipt_pending", 503);
  if (link.crmDealId !== identity.dealId) throw new CrmStatusError("order_not_found", 404);
}

export async function getCrmOrderState(identity: CrmOrderIdentity) {
  return prisma.$transaction(async tx => {
    await assertLinked(tx, identity);
    const order = identity.kind === "retail_order"
      ? await tx.order.findUnique({ where: { id: identity.orderId }, select: { status: true, statusRevision: true, crmProvider: true } })
      : await tx.wholesaleOrder.findUnique({ where: { id: identity.orderId }, select: { status: true, statusRevision: true, crmProvider: true } });
    if (!order || order.crmProvider !== "HAYAT") throw new CrmStatusError("order_not_found", 404);
    return { schemaVersion: 1 as const, ...identity, status: order.status, revision: order.statusRevision };
  });
}

export async function applyCrmStatusCommand(command: CrmStatusCommand) {
  const requestHash = createHash("sha256").update(JSON.stringify([
    command.schemaVersion, command.eventId, command.kind, command.orderId, command.dealId, command.expectedRevision, command.status,
  ])).digest("hex");
  return prisma.$transaction(async tx => {
    // Serialize the event before the order: identity conflicts must not race across different orders.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${command.eventId}, 0))`;
    const previous = await tx.crmStatusReceipt.findUnique({ where: { eventId: command.eventId } });
    if (previous) {
      if (previous.requestHash !== requestHash) throw new CrmStatusError("event_conflict", 409);
      return previous.response as unknown as CrmStatusResult;
    }
    await assertLinked(tx, command);
    if (command.kind === "retail_order") await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${command.orderId} FOR UPDATE`;
    else await tx.$queryRaw`SELECT id FROM "WholesaleOrder" WHERE id = ${command.orderId} FOR UPDATE`;
    const order = command.kind === "retail_order"
      ? await tx.order.findUnique({ where: { id: command.orderId } })
      : await tx.wholesaleOrder.findUnique({ where: { id: command.orderId } });
    if (!order || order.crmProvider !== "HAYAT") throw new CrmStatusError("order_not_found", 404);
    let code: CrmStatusResult["code"] = "unchanged";
    if (order.statusRevision !== command.expectedRevision) code = "stale_revision";
    else if (order.status !== command.status && ["CANCELLED", "DELIVERED", "DONE"].includes(order.status)) code = "terminal";
    else if (order.status !== command.status) {
      if (command.kind === "retail_order") {
        const status = command.status as OrderStatus;
        await tx.order.update({ where: { id: order.id }, data: { status } });
        if (PAID_STATUSES.includes(status)) {
          const settings = await tx.siteSettings.findUnique({ where: { id: "default" }, select: { bonusPercent: true } });
          await accrueOrderBonus(tx, order.id, settings?.bonusPercent ?? 5);
        }
        if (status === "CANCELLED") {
          await revertOrderBonusOnCancel(tx, order.id);
          if ("inventoryVersion" in order && order.inventoryVersion === 1) await restoreReservedStock(tx, order.id);
        }
      } else {
        await tx.wholesaleOrder.update({ where: { id: order.id }, data: { status: command.status as WholesaleOrderStatus } });
      }
      code = "applied";
    }
    const applied = code === "applied" || code === "unchanged";
    const result: CrmStatusResult = { schemaVersion: 1, eventId: command.eventId, kind: command.kind,
      orderId: command.orderId, dealId: command.dealId, applied, code,
      status: applied ? command.status : order.status,
      revision: order.statusRevision + (code === "applied" ? 1 : 0) };
    await tx.crmStatusReceipt.create({ data: { eventId: command.eventId, requestHash, response: { ...result } } });
    return result;
  });
}

export interface CrmStatusResult {
  schemaVersion: 1; eventId: string; kind: CrmOrderIdentity["kind"]; orderId: string; dealId: string;
  applied: boolean; code: "applied" | "unchanged" | "stale_revision" | "terminal"; status: string; revision: number;
}
