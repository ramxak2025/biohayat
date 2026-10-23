import type { TrackerAck, TrackerOperation, TrackerPlanInput, TrackerSnapshot } from '../../../shared/tracker-contract';
import { acknowledge, cellKey, emptyTracker, enqueue, importGuest, markTaken, mergeSnapshot, project, savePlan, type TrackerData } from './engine';
import { addCalendarDays, isDueOn } from './calendar';
interface Dependencies {
  guest: boolean; current: () => boolean; load: () => Promise<TrackerData>;
  transact: (reduce: (data: TrackerData) => void) => Promise<TrackerData>;
  loadGuest: () => Promise<TrackerData>; id: () => string; now: () => string; today: () => string;
  timeZone: () => string; snapshot: (from: string, to: string, zone: string) => Promise<TrackerSnapshot>;
  send: (operation: TrackerOperation, zone: string) => Promise<TrackerAck>;
}
export interface StoreState { data: TrackerData; hydrated: boolean; storageError: string | null; syncError: string | null; syncing: boolean; guestPlanCount: number }
export function createTrackerStore(d: Dependencies) {
  let state: StoreState = { data: emptyTracker(), hydrated: false, storageError: null, syncError: null, syncing: false, guestPlanCount: 0 };
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<StoreState>) => { state = { ...state, ...patch }; for (const l of listeners) l(); };
  const assertCurrent = () => { if (!d.current()) throw new Error('Сессия изменилась. Откройте трекер заново.'); };
  async function reload() {
    try { const data = await d.load(); if (d.current()) publish({ data, hydrated: true, storageError: null }); }
    catch (e) { if (d.current()) publish({ hydrated: true, storageError: message(e) }); }
    if (!d.guest) try { const guest = await d.loadGuest(); if (d.current()) publish({ guestPlanCount: project(guest).plans.filter(p => !state.data.imports[p.id]).length }); } catch { /* Account stays usable if the separate guest vault cannot open. */ }
  }
  async function change(reduce: (data: TrackerData) => void) {
    assertCurrent();
    let domainFailure = false;
    try { const data = await d.transact(data => { try { reduce(data); } catch (e) { domainFailure = true; throw e; } }); if (d.current()) publish({ data, storageError: null }); }
    catch (e) { if (d.current() && !domainFailure) publish({ storageError: message(e) }); throw e; }
  }
  let inFlight: Promise<void> | null = null;
  async function performSync() {
    if (d.guest || !d.current() || !state.hydrated || state.storageError) return;
    publish({ syncing: true, syncError: null });
    try {
      const today = d.today(); const zone = d.timeZone();
      const pull = async () => { const snapshot = await d.snapshot(addCalendarDays(today, -91), today, zone); assertCurrent(); await change(data => mergeSnapshot(data, snapshot, d.now())); };
      await pull();
      for (let attempts = 0; attempts < 500; attempts++) {
        assertCurrent();
        const blocked = new Set(state.data.pending.filter(p => p.conflict).map(p => p.operation.planId));
        const next = state.data.pending.find(p => !blocked.has(p.operation.planId)); if (!next) break;
        const operationId = next.operation.operationId;
        await change(data => { const p = data.pending.find(p => p.operation.operationId === operationId); if (p) p.sent = true; });
        const frozen = state.data.pending.find(p => p.operation.operationId === operationId); if (!frozen) continue;
        try { const ack = await d.send(frozen.operation, zone); assertCurrent(); await change(data => acknowledge(data, ack)); }
        catch (e) {
          assertCurrent();
          if ([400, 409, 422].includes(Number(status(e))) && code(e) !== 'SESSION_CHANGED') { await change(data => { const p = data.pending.find(p => p.operation.operationId === operationId); if (p) p.conflict = message(e); }); continue; }
          throw e;
        }
      }
      await pull();
    } catch (e) { if (d.current()) publish({ syncError: message(e) }); }
    finally { if (d.current()) publish({ syncing: false }); }
  }
  const sync = () => { if (!inFlight) inFlight = performSync().finally(() => { inFlight = null; }); return inFlight; };
  const changed = async (reduce: (data: TrackerData) => void) => { await change(reduce); void sync(); };
  return {
    getState: () => state, subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; }, reload, sync,
    async savePlan(body: TrackerPlanInput, id = d.id(), expectedRevision?: number) { await changed(data => savePlan(data, body, id, d.id(), d.guest, d.now(), expectedRevision)); return id; },
    async setActive(id: string, active: boolean) { await changed(data => { const plan = project(data).plans.find(p => p.id === id); if (!plan) throw new Error('Курс не найден'); enqueue(data, { action: 'update', planId: id, operationId: d.id(), expectedRevision: plan.revision, body: { isActive: active } }, d.guest, d.now()); }); },
    async removePlan(id: string) { await changed(data => { const plan = project(data).plans.find(p => p.id === id); if (plan) enqueue(data, { action: 'delete', planId: id, operationId: d.id(), expectedRevision: plan.revision }, d.guest, d.now()); }); },
    async setTaken(id: string, day: string, slot: string, taken: boolean) { await changed(data => markTaken(data, id, day, slot, taken, d.id(), d.guest, d.now(), d.today())); },
    async handleNotification(event: { deliveryId: string; planIds: string[]; day: string; slot: string }) {
      let skipped = 0;
      await changed(data => {
        if (data.handled?.includes(event.deliveryId)) return;
        for (const id of event.planIds) {
          const view = project(data); const plan = view.plans.find(p => p.id === id);
          const existing = view.cells.some(c => c.planId === id && c.day === event.day && c.slot === event.slot);
          if (!plan || event.day > d.today() || (event.day === d.today() && !existing && (!isDueOn(plan, event.day) || !plan.times.includes(event.slot)))) { skipped++; continue; }
          markTaken(data, id, event.day, event.slot, true, d.id(), d.guest, d.now(), d.today());
        }
        data.handled = [...(data.handled ?? []), event.deliveryId].slice(-500);
      });
      return { skipped };
    },
    async importGuest() { if (d.guest) return; const guest = await d.loadGuest(); assertCurrent(); await changed(data => importGuest(data, guest, d.id)); publish({ guestPlanCount: 0 }); },
    async resolveConflict(id: string, choice: 'server' | 'local') {
      await changed(data => {
        const conflict = data.pending.find(p => p.operation.operationId === id); if (!conflict) return;
        const planId = conflict.operation.planId; const view = project(data);
        const localPlan = view.plans.find(p => p.id === planId); const localOps = data.pending.filter(p => p.operation.planId === planId);
        data.pending = data.pending.filter(p => p.operation.planId !== planId);
        if (choice === 'server') { if (!data.plans.some(p => p.id === planId)) data.cells = data.cells.filter(c => c.planId !== planId); return; }
        const remote = data.plans.find(p => p.id === planId);
        if (!localPlan) { if (remote) enqueue(data, { action: 'delete', planId, operationId: d.id(), expectedRevision: remote.revision }, false, d.now()); return; }
        const { id: _id, revision: _rev, logs: _logs, startDate: _date, scheduleVersion: _v, ...body } = localPlan;
        if (!remote) {
          const history = view.cells.filter(c => c.planId === planId && c.taken).map(({ day, slot, takenAt }) => ({ day, slot, takenAt }));
          if (history.length > 5000) throw new Error('В курсе больше 5000 отметок. Обратитесь в поддержку для переноса истории.');
          const copyId = d.id();
          enqueue(data, { action: 'create', planId: copyId, operationId: d.id(), expectedRevision: 0, body, initialLogs: history }, false, d.now());
          data.cells = data.cells.filter(c => c.planId !== planId); return;
        }
        if (localOps.some(p => p.operation.action !== 'log')) savePlan(data, body, planId, d.id(), false, d.now());
        const keys = new Set(localOps.flatMap(p => p.operation.action === 'log' ? [cellKey({ planId, ...p.operation.body })] : []));
        for (const cell of view.cells) if (keys.has(cellKey(cell))) markTaken(data, planId, cell.day, cell.slot, cell.taken, d.id(), false, d.now(), d.today());
      });
    },
  };
}
function message(e: unknown) { return e instanceof Error ? e.message : 'Не удалось сохранить данные. Повторите попытку.'; }
function status(e: unknown) { return typeof e === 'object' && e && 'status' in e ? e.status : undefined; }
function code(e: unknown) { return typeof e === 'object' && e && 'code' in e ? e.code : undefined; }
