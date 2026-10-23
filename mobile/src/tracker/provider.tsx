import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { apiFetch } from '@/api/client';
import { sessionGeneration } from '@/lib/session-generation';
import { setIntakeActionHandler, syncIntakeReminders } from '@/lib/notifications';
import { localDay } from '@/lib/format';
import { createTrackerStore } from './store';
import { project } from './engine';
import { loadTracker, partitionFor, purgeTracker, transactTracker } from './vault';
import { newTrackerId } from './ids';
import { trackerTimeZone } from './clock';
import type { TrackerController } from './types';
import type { TrackerAck, TrackerSnapshot } from '../../../shared/tracker-contract';
const Context = createContext<TrackerController | null>(null);
export function TrackerProvider({ children }: { children: ReactNode }) {
  const customerId = useAuth(s => s.customer?.id ?? null); const hydrating = useAuth(s => s.hydrating);
  const epoch = sessionGeneration();
  const owner = customerId ?? 'guest'; const partitionKey = partitionFor(owner);
  const store = useMemo(() => createTrackerStore({
    guest: owner === 'guest', current: () => epoch === sessionGeneration() && !useAuth.getState().hydrating && (useAuth.getState().customer?.id ?? 'guest') === owner,
    load: () => loadTracker(partitionKey), transact: reduce => transactTracker(partitionKey, reduce), loadGuest: () => loadTracker(partitionFor('guest')),
    id: newTrackerId, now: () => new Date().toISOString(), today: localDay, timeZone: trackerTimeZone,
    snapshot: (from, to, timeZone) => apiFetch<TrackerSnapshot>('/tracker/snapshot', { method: 'POST', body: { from, to, timeZone } }),
    send: (operation, timeZone) => apiFetch<TrackerAck>('/tracker/operations', { method: 'POST', body: { operation, timeZone } }),
  }), [owner, partitionKey, epoch]);
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const online = useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), () => onlineManager.isOnline(), () => true);
  useEffect(() => { if (!hydrating) void store.reload().then(() => store.sync()); }, [store, hydrating]);
  useEffect(() => { if (online && !hydrating) void store.sync(); }, [store, online, hydrating]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', s => { if (s === 'active') void store.reload().then(() => store.sync()); });
    const timer = setInterval(() => { if (AppState.currentState === 'active' && onlineManager.isOnline()) void store.sync(); }, 60_000);
    return () => { listener.remove(); clearInterval(timer); };
  }, [store]);
  const view = useMemo(() => project(state.data), [state.data]);
  useEffect(() => { if (!hydrating && state.hydrated && !state.storageError) return setIntakeActionHandler(owner, store.handleNotification); }, [owner, store, hydrating, state.hydrated, state.storageError]);
  useEffect(() => { if (!hydrating && state.hydrated && !state.storageError && (owner === 'guest' || state.data.plansKnown)) void syncIntakeReminders(view.plans).catch(() => undefined); }, [owner, hydrating, state.hydrated, state.storageError, state.data.plansKnown, view.plans]);
  const value: TrackerController = {
    partitionKey, access: owner === 'guest' ? 'guest' : 'account', hydrated: !hydrating && state.hydrated,
    plansKnown: state.data.plansKnown || owner === 'guest', storageError: state.storageError, syncError: state.syncError,
    plans: view.plans, logs: view.cells.filter(c => c.taken).map(({ planId, day, slot, takenAt }) => ({ planId, day, slot, takenAt })),
    ranges: state.data.ranges, pendingCount: state.data.pending.length, syncing: state.syncing, online,
    lastSyncedAt: state.data.lastSyncedAt, guestPlanCount: state.guestPlanCount,
    conflicts: state.data.pending.filter(p => p.conflict).map(p => ({ id: p.operation.operationId, planId: p.operation.planId, title: view.plans.find(v => v.id === p.operation.planId)?.title ?? 'Курс', message: p.conflict!, deletedRemotely: !state.data.plans.some(v => v.id === p.operation.planId) })),
    isDayKnown: day => owner === 'guest' || state.data.ranges.some(r => day >= r.from && day <= r.to),
    planSyncState: id => owner === 'guest' ? 'local' : state.data.pending.some(p => p.operation.planId === id && p.conflict) ? 'conflict' : state.data.pending.some(p => p.operation.planId === id) ? state.syncing ? 'syncing' : 'queued' : 'synced',
    savePlan: store.savePlan, setActive: store.setActive, removePlan: store.removePlan, setTaken: store.setTaken,
    sync: store.sync, reload: store.reload, resolveConflict: store.resolveConflict, importGuest: store.importGuest,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTracker() { const value = useContext(Context); if (!value) throw new Error('TrackerProvider missing'); return value; }
export const purgeAccountTracker = (customerId: string) => purgeTracker(partitionFor(customerId));
