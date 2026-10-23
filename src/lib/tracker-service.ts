import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma, type IntakePlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dayInTimeZone, normalizeTimes, parseRange } from "@/app/api/v2/intake/_lib";
import { isCalendarDay, isDueOn } from "../../shared/intake-calendar";
import type { TrackerAck, TrackerCell, TrackerOperation, TrackerPlan, TrackerSnapshot } from "../../shared/tracker-contract";

export class TrackerError extends Error {
  constructor(message: string, public code = "VALIDATION", public status = 400) { super(message); }
}
const day = z.string().refine(isCalendarDay, "Некорректная календарная дата");
const fields = {
  productId: z.string().max(80).nullable(), title: z.string().trim().min(1).max(200),
  anchorDay: day, intervalDays: z.number().int().min(1).max(365),
  durationDays: z.number().int().min(1).max(3650).nullable(),
  times: z.array(z.string()).min(1).max(24).refine(v => normalizeTimes(v) !== null),
  note: z.string().max(1000).nullable(), isActive: z.boolean(),
};
const opBase = { operationId: z.string().uuid(), planId: z.string().min(1).max(80), expectedRevision: z.number().int().min(0).max(2147483646) };
export const operationSchema = z.discriminatedUnion("action", [
  z.object({ ...opBase, action: z.literal("create"), planId: z.string().uuid(), expectedRevision: z.literal(0), body: z.object(fields).strict(), initialLogs: z.array(z.object({ day, slot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), takenAt: z.string().datetime() }).strict()).max(5000).optional() }).strict(),
  z.object({ ...opBase, action: z.literal("update"), body: z.object(fields).partial().strict().refine(v => Object.keys(v).length > 0) }).strict(),
  z.object({ ...opBase, action: z.literal("delete") }).strict(),
  z.object({ ...opBase, action: z.literal("log"), body: z.object({ day, slot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), taken: z.boolean() }).strict() }).strict(),
]);
export const snapshotSchema = z.object({ from: day, to: day, timeZone: z.string().min(1).max(64) }).strict();
export function validZone(zone: string) {
  const today = dayInTimeZone(zone);
  if (!today) throw new TrackerError("Неизвестный часовой пояс");
  return today;
}
export function serializeTrackerPlan(p: IntakePlan): TrackerPlan {
  if (!p.anchorDay) throw new TrackerError("Расписание ещё не подготовлено", "RETRY", 409);
  return { id: p.id, productId: p.productId, title: p.title, times: p.times, anchorDay: p.anchorDay, intervalDays: p.intervalDays, durationDays: p.durationDays, note: p.note, isActive: p.isActive, startDate: p.startDate.toISOString(), revision: p.revision, scheduleVersion: p.scheduleVersion, logs: [] };
}
/** All tracker writers, including legacy/web, acquire this owner lock first. */
export async function withTrackerLock<T>(customerId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${customerId} FOR UPDATE`;
    const owner = await tx.customer.findFirst({ where: { id: customerId, isActive: true, deletedAt: null }, select: { id: true } });
    if (!owner) throw new TrackerError("Требуется вход в аккаунт", "UNAUTHORIZED", 401);
    return fn(tx);
  }, { timeout: 15000 });
}
export async function prepareLegacyAnchors(tx: Prisma.TransactionClient, customerId: string, zone: string) {
  const pending = await tx.intakePlan.findMany({ where: { customerId, anchorDay: null } });
  for (const plan of pending) {
    const anchor = dayInTimeZone(zone, plan.startDate);
    if (!anchor) throw new TrackerError("Некорректная дата начала курса");
    await tx.intakePlan.update({ where: { id: plan.id }, data: { anchorDay: anchor, revision: { increment: 1 } } });
  }
}
export async function trackerSnapshot(customerId: string, body: z.infer<typeof snapshotSchema>): Promise<TrackerSnapshot> {
  const serverDay = validZone(body.timeZone);
  const url = new URL("http://tracker.local"); url.searchParams.set("from", body.from); url.searchParams.set("to", body.to);
  if (!parseRange(url).ok) throw new TrackerError("Период истории должен быть не более 92 дней");
  return withTrackerLock(customerId, async tx => {
    await prepareLegacyAnchors(tx, customerId, body.timeZone);
    const plans = await tx.intakePlan.findMany({ where: { customerId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const logs = await tx.intakeLog.findMany({ where: { plan: { customerId }, day: { gte: body.from, lte: body.to } }, orderBy: [{ day: "asc" }, { planId: "asc" }, { slot: "asc" }], take: 50001 });
    if (logs.length > 50000) throw new TrackerError("Выберите более короткий период истории", "RANGE_TOO_LARGE", 422);
    return { protocol: 1, complete: true, plans: plans.map(serializeTrackerPlan), cells: logs.map(l => ({ planId: l.planId, day: l.day, slot: l.slot, taken: l.taken, revision: l.revision, takenAt: l.takenAt.toISOString() })), range: { from: body.from, to: body.to }, serverDay };
  });
}
function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map(k => `${JSON.stringify(k)}:${stable(obj[k])}`).join(",")}}`;
}
async function current(tx: Prisma.TransactionClient, customerId: string, op: TrackerOperation, ackRevision: number): Promise<TrackerAck> {
  const plan = await tx.intakePlan.findFirst({ where: { id: op.planId, customerId } });
  let cell: TrackerCell | null = null;
  if (plan && op.action === "log") {
    const row = await tx.intakeLog.findUnique({ where: { planId_day_slot: { planId: op.planId, day: op.body.day, slot: op.body.slot } } });
    if (row) cell = { planId: row.planId, day: row.day, slot: row.slot, taken: row.taken, revision: row.revision, takenAt: row.takenAt.toISOString() };
  }
  return { operationId: op.operationId, acknowledgedRevision: ackRevision, currentPlan: plan ? serializeTrackerPlan(plan) : null, currentCell: cell };
}
/** An immutable receipt is checked before looking for a plan: deletion must not resurrect a lost create ack. */
export async function applyTrackerOperation(customerId: string, op: TrackerOperation, zone: string): Promise<TrackerAck> {
  const today = validZone(zone);
  const hash = createHash("sha256").update(stable(op)).digest("hex");
  return withTrackerLock(customerId, async tx => {
    const receipt = await tx.intakeMutation.findUnique({ where: { customerId_operationId: { customerId, operationId: op.operationId } } });
    if (receipt) {
      if (receipt.requestHash !== hash) throw new TrackerError("Идентификатор изменения уже использован", "OPERATION_REUSED", 409);
      const result = receipt.result as { revision: number };
      return current(tx, customerId, op, result.revision);
    }
    await prepareLegacyAnchors(tx, customerId, zone);
    let plan = await tx.intakePlan.findFirst({ where: { id: op.planId, customerId } });
    let revision = 0;
    if (op.action === "create") {
      const previous = await tx.intakeMutation.findFirst({ where: { customerId, planId: op.planId, action: "create" }, select: { operationId: true } });
      if (plan || previous) throw new TrackerError("Курс уже создан или удалён. Обновите данные", "PLAN_EXISTS", 409);
      const product = op.body.productId ? await tx.product.findFirst({ where: { id: op.body.productId, isActive: true }, select: { id: true } }) : null;
      try {
        plan = await tx.intakePlan.create({ data: { ...op.body, id: op.planId, customerId, productId: product?.id ?? null, times: normalizeTimes(op.body.times)!, note: op.body.note?.trim() || null, scheduleVersion: 2 } });
      } catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new TrackerError("Не удалось использовать идентификатор курса", "PLAN_EXISTS", 409); throw e; }
      if (op.initialLogs?.length) {
        if (op.initialLogs.some(log => log.day > today)) throw new TrackerError("История не может содержать будущие приёмы");
        await tx.intakeLog.createMany({ data: op.initialLogs.map(log => ({ planId: plan!.id, day: log.day, slot: log.slot, takenAt: new Date(log.takenAt), taken: true })), skipDuplicates: true });
      }
      revision = plan.revision;
    } else {
      if (!plan) throw new TrackerError("Курс удалён на другом устройстве", "PLAN_DELETED", 409);
      if (op.action === "log") {
        const key = { planId: plan.id, day: op.body.day, slot: op.body.slot };
        const existing = await tx.intakeLog.findUnique({ where: { planId_day_slot: key } });
        if (op.body.day > today && op.body.taken) throw new TrackerError("Будущий приём пока нельзя отметить", "SCHEDULE_CHANGED", 409);
        if (op.body.taken && op.body.day === today && !existing && (!isDueOn({ ...plan, anchorDay: plan.anchorDay! }, today) || !plan.times.includes(op.body.slot))) throw new TrackerError("Расписание этого приёма изменилось", "SCHEDULE_CHANGED", 409);
        if ((existing?.revision ?? 0) !== op.expectedRevision && (existing?.taken ?? false) !== op.body.taken) throw new TrackerError("Эту отметку изменили на другом устройстве", "REVISION_CONFLICT", 409);
        if (!existing && !op.body.taken) revision = 0;
        // A semantic no-op must not lend a foreign writer's revision to queued dependent edits.
        else if (existing && existing.taken === op.body.taken) revision = op.expectedRevision;
        else {
          const row = await tx.intakeLog.upsert({ where: { planId_day_slot: key }, create: { ...key, taken: op.body.taken }, update: { taken: op.body.taken, takenAt: new Date(), revision: { increment: 1 } } });
          revision = row.revision;
        }
      } else {
        if (plan.revision !== op.expectedRevision) throw new TrackerError("Курс изменили на другом устройстве", "REVISION_CONFLICT", 409);
        if (op.action === "delete") { revision = plan.revision + 1; await tx.intakePlan.delete({ where: { id: plan.id } }); }
        else {
          let productId = op.body.productId;
          if (productId) productId = (await tx.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } }))?.id ?? null;
          const updated = await tx.intakePlan.update({ where: { id: plan.id }, data: { ...op.body, ...(productId !== undefined ? { productId } : {}), ...(op.body.times ? { times: normalizeTimes(op.body.times)! } : {}), ...(op.body.note !== undefined ? { note: op.body.note?.trim() || null } : {}), scheduleVersion: 2, revision: { increment: 1 } } });
          revision = updated.revision;
        }
      }
    }
    await tx.intakeMutation.create({ data: { customerId, operationId: op.operationId, action: op.action, planId: op.planId, requestHash: hash, result: { revision } } });
    return current(tx, customerId, op, revision);
  });
}

/** Bridge for old daily clients and updated website actions, sharing the revision/owner lock. */
export async function mutateLegacyPlan(customerId: string, planId: string, patch: Partial<import("../../shared/tracker-contract").TrackerPlanInput> | "delete", modernWeb = false) {
  return withTrackerLock(customerId, async tx => {
    const plan = await tx.intakePlan.findFirst({ where: { id: planId, customerId } });
    if (!plan) throw new TrackerError("Курс не найден", "NOT_FOUND", 404);
    if (!modernWeb && (plan.scheduleVersion > 1 || plan.intervalDays !== 1)) throw new TrackerError("Обновите приложение для этого расписания", "UPGRADE_REQUIRED", 409);
    if (patch === "delete") { await tx.intakePlan.delete({ where: { id: plan.id } }); return null; }
    return tx.intakePlan.update({ where: { id: plan.id }, data: { ...patch, revision: { increment: 1 } } });
  });
}
