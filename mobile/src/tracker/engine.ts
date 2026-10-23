import type { TrackerAck, TrackerCell, TrackerOperation, TrackerPlan, TrackerPlanInput, TrackerRange, TrackerSnapshot } from '../../../shared/tracker-contract';
import { addCalendarDays, isCalendarDay, isDueOn, isSlot } from './calendar';

export interface Pending { operation: TrackerOperation; sent: boolean; after?: string; conflict?: string; draft?: TrackerPlan }
export interface TrackerData {
  schema: 1; plansKnown: boolean; plans: TrackerPlan[]; cells: TrackerCell[];
  ranges: TrackerRange[]; pending: Pending[]; imports: Record<string, string>;
  lastSyncedAt: string | null; handled?: string[];
}
export const emptyTracker = (): TrackerData => ({ schema: 1, plansKnown: false, plans: [], cells: [], ranges: [], pending: [], imports: {}, lastSyncedAt: null });
export const cellKey = (c: { planId: string; day: string; slot: string }) => `${c.planId}|${c.day}|${c.slot}`;
const entityKey = (o: TrackerOperation) => o.action === 'log' ? cellKey({ planId: o.planId, ...o.body }) : o.planId;
export function validatePlan(p: TrackerPlanInput) {
  if (!p.title.trim() || p.title.length > 200 || !isCalendarDay(p.anchorDay) || !Number.isInteger(p.intervalDays) || p.intervalDays < 1 || p.intervalDays > 365 || (p.durationDays !== null && (!Number.isInteger(p.durationDays) || p.durationDays < 1 || p.durationDays > 3650)) || !p.times.length || p.times.length > 24 || p.times.some(t => !isSlot(t)) || new Set(p.times).size !== p.times.length || (p.note?.length ?? 0) > 1000) throw new Error('Проверьте название, даты и время приёма');
}
function apply(data: Pick<TrackerData, 'plans' | 'cells'>, op: TrackerOperation, now: string) {
  const index = data.plans.findIndex(p => p.id === op.planId);
  if (op.action === 'create') {
    if (index >= 0) return;
    data.plans.push({ ...op.body, id: op.planId, revision: 1, scheduleVersion: 2, startDate: now, logs: [] });
    for (const c of op.initialLogs ?? []) data.cells.push({ ...c, planId: op.planId, revision: 1, taken: true });
  } else if (op.action === 'update') {
    if (index >= 0) data.plans[index] = { ...data.plans[index], ...op.body, revision: op.expectedRevision + 1, scheduleVersion: 2 };
  } else if (op.action === 'delete') {
    data.plans = data.plans.filter(p => p.id !== op.planId);
    data.cells = data.cells.filter(c => c.planId !== op.planId);
  } else {
    const key = cellKey({ planId: op.planId, ...op.body });
    const before = data.cells.find(c => cellKey(c) === key);
    data.cells = data.cells.filter(c => cellKey(c) !== key);
    data.cells.push({ planId: op.planId, ...op.body, revision: before?.taken === op.body.taken ? before.revision : op.expectedRevision + 1, takenAt: now });
  }
}
export function project(data: TrackerData) {
  const view = { plans: data.plans.map(p => ({ ...p })), cells: [...data.cells] };
  for (const p of data.pending) {
    if (p.draft && p.operation.action !== 'delete' && !view.plans.some(v => v.id === p.operation.planId)) view.plans.push({ ...p.draft });
    apply(view, p.operation, p.draft?.startDate ?? '1970-01-01T00:00:00.000Z');
  }
  return view;
}
export function enqueue(data: TrackerData, op: TrackerOperation, guest: boolean, now: string) {
  if (guest) { apply(data, op, now); data.plansKnown = true; return; }
  const previous = data.pending.findLast(p => entityKey(p.operation) === entityKey(op));
  const draft = project(data).plans.find(p => p.id === op.planId);
  data.pending.push({ operation: op, sent: false, ...(draft ? { draft } : {}), ...(previous ? { after: previous.operation.operationId } : {}) });
}
export function savePlan(data: TrackerData, body: TrackerPlanInput, planId: string, operationId: string, guest: boolean, now: string, expectedRevision?: number) {
  validatePlan(body);
  const previous = project(data).plans.find(p => p.id === planId);
  const editing = !!previous || (!guest && expectedRevision !== undefined);
  enqueue(data, editing
    ? { action: 'update', planId, operationId, expectedRevision: expectedRevision ?? previous!.revision, body }
    : { action: 'create', planId, operationId, expectedRevision: 0, body }, guest, now);
  if (editing && !previous && !guest) data.pending[data.pending.length - 1].draft = { ...body, id: planId, revision: expectedRevision!, startDate: now, scheduleVersion: 2, logs: [] };

}
export function markTaken(data: TrackerData, planId: string, day: string, slot: string, taken: boolean, operationId: string, guest: boolean, now: string, today: string) {
  if (!isCalendarDay(day) || !isSlot(slot) || (taken && day > today)) throw new Error('Нельзя отмечать будущий приём');
  const view = project(data); const plan = view.plans.find(p => p.id === planId);
  if (!plan) throw new Error('Курс больше не доступен');
  const cell = view.cells.find(c => cellKey(c) === cellKey({ planId, day, slot }));
  if (taken && day === today && !cell && (!isDueOn(plan, day) || !plan.times.includes(slot))) throw new Error('На сегодня этот приём не запланирован');
  if (cell?.taken === taken) return;
  enqueue(data, { action: 'log', planId, operationId, expectedRevision: cell?.revision ?? 0, body: { day, slot, taken } }, guest, now);
}
export function mergeSnapshot(data: TrackerData, snapshot: TrackerSnapshot, now: string) {
  if (snapshot.protocol !== 1 || !snapshot.complete || !Array.isArray(snapshot.plans) || !Array.isArray(snapshot.cells)) throw new Error('Не удалось получить полную историю');
  data.plans = snapshot.plans;
  const remoteIds = new Set(data.plans.map(p => p.id));
  const pendingIds = new Set(data.pending.map(p => p.operation.planId));
  data.cells = data.cells.filter(c => (!remoteIds.has(c.planId) && pendingIds.has(c.planId)) || (remoteIds.has(c.planId) && (c.day < snapshot.range.from || c.day > snapshot.range.to))).concat(snapshot.cells);
  const sorted = [...data.ranges, snapshot.range].sort((a,b) => a.from.localeCompare(b.from));
  data.ranges = [];
  for (const range of sorted) {
    const last = data.ranges[data.ranges.length - 1];
    if (last && range.from <= addCalendarDays(last.to, 1)) last.to = last.to > range.to ? last.to : range.to;
    else data.ranges.push({ ...range });
  }
  data.plansKnown = true; data.lastSyncedAt = now;
}
export function acknowledge(data: TrackerData, ack: TrackerAck) {
  const p = data.pending.find(p => p.operation.operationId === ack.operationId);
  if (!p) return;
  const op = p.operation;
  const recoverable = project(data).cells.filter(c => c.planId === op.planId);
  data.plans = data.plans.filter(p => p.id !== op.planId);
  if (ack.currentPlan) data.plans.push(ack.currentPlan);
  else {
    const hasLaterWork = data.pending.some(p => p.operation.operationId !== ack.operationId && p.operation.planId === op.planId);
    data.cells = data.cells.filter(c => c.planId !== op.planId).concat(hasLaterWork ? recoverable : []);
  }
  if (op.action === 'log' && ack.currentPlan) {
    const key = cellKey({ planId: op.planId, ...op.body });
    data.cells = data.cells.filter(c => cellKey(c) !== key);
    if (ack.currentCell) data.cells.push(ack.currentCell);
  }
  if (op.action === 'create' && ack.currentPlan) {
    // Atomic imported records are returned by the following snapshot; retain local truth until then.
    for (const c of op.initialLogs ?? []) if (!data.cells.some(v => cellKey(v) === cellKey({ planId: op.planId, ...c }))) data.cells.push({ ...c, planId: op.planId, taken: true, revision: 1 });
  }
  data.pending = data.pending.filter(p => p.operation.operationId !== ack.operationId);
  for (const child of data.pending) if (child.after === ack.operationId && !child.sent) {
    child.operation.expectedRevision = ack.acknowledgedRevision; delete child.after;
  }
}
export function importGuest(data: TrackerData, guest: TrackerData, newId: () => string) {
  for (const plan of project(guest).plans) {
    if (data.imports[plan.id]) continue;
    if (project(guest).cells.filter(c => c.planId === plan.id && c.taken).length > 5000) throw new Error("В курсе больше 5000 отметок; обратитесь в поддержку для переноса полной истории");
    const planId = newId(); data.imports[plan.id] = planId;
    const { id: _id, revision: _revision, scheduleVersion: _version, startDate: _date, logs: _logs, ...body } = plan;
    data.pending.push({ sent: false, operation: { action: 'create', planId, operationId: newId(), expectedRevision: 0, body, initialLogs: project(guest).cells.filter(c => c.planId === plan.id && c.taken).map(({ day, slot, takenAt }) => ({ day, slot, takenAt })) } });
  }
}
