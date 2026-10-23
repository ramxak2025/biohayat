import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { loader, loadCallback } from './load-ts.mjs';
const load = loader();
const cal = load('src/tracker/calendar.ts');
const engine = load('src/tracker/engine.ts');
const { createTrackerStore } = load('src/tracker/store.ts');
const input = (extra = {}) => ({ productId: null, title: 'Магний', anchorDay: '2026-10-23', intervalDays: 4, durationDays: 9, times: ['09:00'], note: null, isActive: true, ...extra });
const plan = (extra = {}) => ({ ...input(), id: 'plan', revision: 1, scheduleVersion: 2, startDate: '2026-10-23T06:00:00.000Z', logs: [], ...extra });
const copy = x => JSON.parse(JSON.stringify(x));
const snapshot = (plans = [plan()], cells = []) => ({ protocol: 1, complete: true, plans, cells, range: { from: '2026-07-24', to: '2026-10-23' }, serverDay: '2026-10-23' });

test('civil intervals cross month/leap/year and inclusive duration, independent of DST', () => {
  assert.deepEqual(Array.from(cal.nextDueDays(input(), '2026-10-23', 5)), ['2026-10-23', '2026-10-27', '2026-10-31']);
  assert.deepEqual(Array.from(cal.nextDueDays(input({ anchorDay: '2024-02-27', durationDays: null }), '2024-02-28', 2)), ['2024-03-02', '2024-03-06']);
  assert.equal(cal.addCalendarDays('2026-12-31', 1), '2027-01-01');
  assert.equal(cal.calendarDaysBetween('2026-03-28', '2026-03-30'), 2);
  for (const day of ['2026-02-29', '2026-13-01', '2026-10-3']) assert.equal(cal.isCalendarDay(day), false);
  assert.equal(cal.isDueOn(input(), '2026-10-24'), false);
  assert.equal(cal.isDueOn(input({ isActive: false }), '2026-10-23'), false);
});
test('dated reminders honor future start, gaps, end, pause, aggregation and global budget', () => {
  const { reminderOccurrences } = load('src/tracker/reminder-schedule.ts');
  const now = new Date(2026, 9, 23, 8);
  const items = reminderOccurrences([plan(), plan({ id: 'second' }), plan({ id: 'paused', isActive: false })], now, '2026-10-23', 2);
  assert.deepEqual(Array.from(items, p => p.day), ['2026-10-23', '2026-10-27']);
  assert.deepEqual(Array.from(items[0].planIds), ['plan', 'second']);
  assert.equal(reminderOccurrences([plan()], now, '2026-10-23', 0).length, 0);
  const future = reminderOccurrences([plan({ anchorDay: '2026-10-30', durationDays: 1 })], now, '2026-10-23', 60);
  assert.equal(future.length, 1); assert.equal(future[0].day, '2026-10-30');
});
test('local guest save survives restart; stable draft ID prevents duplicate courses', async () => {
  const h = harness(true); const store = createTrackerStore(h.deps); await store.reload();
  await store.savePlan(input(), 'draft'); await store.savePlan(input({ title: 'Магний вечер' }), 'draft');
  await store.setTaken('draft', '2026-10-23', '09:00', true);
  const restarted = createTrackerStore(h.deps); await restarted.reload();
  assert.equal(restarted.getState().data.plans.length, 1); assert.equal(restarted.getState().data.cells[0].taken, true); assert.equal(h.sends.length, 0);
});
test('offline queue is durable; request replay keeps operation ID and does not toggle', async () => {
  const h = harness(); h.setData({ ...engine.emptyTracker(), plans: [plan()], plansKnown: true });
  h.offline = true; const s = createTrackerStore(h.deps); await s.reload();
  await s.setTaken('plan', '2026-10-23', '09:00', true); await s.sync();
  assert.equal(s.getState().data.pending.length, 1);
  h.offline = false; h.loseAck = true; await s.sync();
  const frozen = copy(h.sends[0]); assert.equal(s.getState().data.pending.length, 1);
  const restarted = createTrackerStore(h.deps); await restarted.reload(); h.loseAck = false; await restarted.sync();
  assert.deepEqual(h.sends[1], frozen); assert.equal(restarted.getState().data.pending.length, 0); assert.equal(h.remote.cells[0].taken, true);
});
test('failed local persistence never reports success or publishes optimistic data', async () => {
  const h = harness(true); const s = createTrackerStore(h.deps); await s.reload(); h.failWrite = true;
  await assert.rejects(s.savePlan(input(), 'draft'), /disk/); assert.equal(s.getState().data.plans.length, 0); assert.ok(s.getState().storageError);
});
test('old mark acknowledgement cannot erase a later pending unmark; own successor uses original ack revision', () => {
  const data = { ...engine.emptyTracker(), plans: [plan()] };
  engine.markTaken(data, 'plan', '2026-10-23', '09:00', true, 'mark', false, '2026-10-23T08:00:00Z', '2026-10-23');
  engine.markTaken(data, 'plan', '2026-10-23', '09:00', false, 'unmark', false, '2026-10-23T08:00:01Z', '2026-10-23');
  engine.acknowledge(data, { operationId: 'mark', acknowledgedRevision: 1, currentPlan: plan(), currentCell: { planId: 'plan', day: '2026-10-23', slot: '09:00', taken: true, revision: 3, takenAt: '2026-10-23T08:00:00Z' } });
  assert.equal(data.pending[0].operation.expectedRevision, 1); assert.equal(engine.project(data).cells[0].taken, false);
});
test('remote deleted create receipt never resurrects course; later local edit remains recoverable', () => {
  const data = engine.emptyTracker();
  engine.savePlan(data, input(), 'draft', 'create', false, '2026-10-23T08:00:00Z');
  engine.savePlan(data, input({ title: 'Местный вариант' }), 'draft', 'edit', false, '2026-10-23T08:00:01Z');
  engine.acknowledge(data, { operationId: 'create', acknowledgedRevision: 1, currentPlan: null, currentCell: null });
  assert.equal(data.plans.length, 0); assert.equal(engine.project(data).plans[0].title, 'Местный вариант');
});
test('conflict retains local draft; explicit server choice discards only that course changes', async () => {
  const h = harness(); h.setData({ ...engine.emptyTracker(), plans: [plan()], plansKnown: true }); h.conflict = true;
  const s = createTrackerStore(h.deps); await s.reload(); await s.savePlan(input({ title: 'Местный' }), 'plan'); await s.sync();
  assert.ok(s.getState().data.pending[0].conflict); assert.equal(engine.project(s.getState().data).plans[0].title, 'Местный');
  await s.resolveConflict(s.getState().data.pending[0].operation.operationId, 'server'); await s.sync(); assert.equal(s.getState().data.pending.length, 0);
});
test('401 and session change retain original encrypted partition queue without publishing late results', async () => {
  const h = harness(); h.setData({ ...engine.emptyTracker(), plans: [plan()] }); h.offline = true;
  const s = createTrackerStore(h.deps); await s.reload(); await s.setTaken('plan', '2026-10-23', '09:00', true); await s.sync();
  h.offline = false; h.authError = true; await s.sync(); assert.equal(s.getState().data.pending.length, 1);
  h.current = false; await assert.rejects(s.savePlan(input(), 'leak'), /Сессия/); assert.equal(h.data.plans.some(p => p.id === 'leak'), false);
});
test('guest import stores mapping and queue atomically, is repeatable after restart, preserves source', () => {
  const guest = { ...engine.emptyTracker(), plans: [plan()], cells: [{ planId: 'plan', day: '2026-10-23', slot: '09:00', taken: true, revision: 1, takenAt: '2026-10-23T08:00:00Z' }] };
  const before = JSON.stringify(guest); const account = engine.emptyTracker(); let n = 0;
  engine.importGuest(account, guest, () => `id${++n}`); const restarted = copy(account); engine.importGuest(restarted, guest, () => `id${++n}`);
  assert.equal(restarted.pending.length, 1); assert.equal(restarted.pending[0].operation.initialLogs.length, 1); assert.equal(JSON.stringify(guest), before);
});
test('actual old-time history remains visible after schedule change, pause and timezone movement', () => {
  const data = { ...engine.emptyTracker(), plans: [plan()], cells: [{ planId: 'plan', day: '2026-10-23', slot: '08:00', taken: true, revision: 1, takenAt: '2026-10-23T05:00:00Z' }] };
  engine.savePlan(data, input({ times: ['10:00'], isActive: false }), 'plan', 'edit', true, '2026-10-23T06:00:00Z');
  assert.equal(data.cells[0].slot, '08:00'); assert.equal(data.plans[0].anchorDay, '2026-10-23');
});

function harness(guest = false) {
  let n = 0; const h = { data: engine.emptyTracker(), remote: snapshot(), sends: [], offline: false, failWrite: false, loseAck: false, conflict: false, authError: false, current: true, setData(data) { h.data = copy(data); } }; const receipts = new Map();
  h.deps = { guest, current: () => h.current, load: async () => copy(h.data), loadGuest: async () => engine.emptyTracker(),
    transact: async reduce => { const next = copy(h.data); reduce(next); if (h.failWrite) throw new Error('disk full'); h.data = copy(next); return next; },
    id: () => `op-${++n}`, now: () => '2026-10-23T08:00:00.000Z', today: () => '2026-10-23', timeZone: () => 'Europe/Moscow',
    snapshot: async () => { if (h.offline) throw new Error('offline'); if (h.authError) throw Object.assign(new Error('unauthorized'), { status: 401 }); return copy(h.remote); },
    send: async op => { h.sends.push(copy(op)); if (h.conflict) throw Object.assign(new Error('changed remotely'), { status: 409 });
      let ack = receipts.get(op.operationId); if (!ack) { const cell = { planId: op.planId, ...op.body, revision: 1, takenAt: '2026-10-23T08:00:00.000Z' }; h.remote.cells = [cell]; ack = { operationId: op.operationId, acknowledgedRevision: 1, currentPlan: h.remote.plans[0], currentCell: cell }; receipts.set(op.operationId, ack); }
      if (h.loseAck) throw new Error('response lost'); return copy(ack); },
  }; return h;
}

function vaultHarness() {
  const storage = new Map(); const secrets = new Map(); let writesFail = false;
  class Key { constructor(bytes) { this.value = bytes; } static async generate() { return new Key(randomBytes(32)); } static async import(hex) { return new Key(Buffer.from(hex, 'hex')); } async encoded() { return this.value.toString('hex'); } }
  const crypto = { AESEncryptionKey: Key, CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_, s) => createHash('sha256').update(s).digest('hex'),
    AESSealedData: { fromCombined: raw => ({ raw }) },
    aesEncryptAsync: async (plain, key, opts) => { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key.value, iv); cipher.setAAD(opts.additionalData); const data = Buffer.concat([iv, cipher.update(plain), cipher.final(), cipher.getAuthTag()]); return { combined: async () => data.toString('base64') }; },
    aesDecryptAsync: async (sealed, key, opts) => { const raw = Buffer.from(sealed.raw, 'base64'); const decipher = createDecipheriv('aes-256-gcm', key.value, raw.subarray(0, 12)); decipher.setAAD(opts.additionalData); decipher.setAuthTag(raw.subarray(-16)); return Buffer.concat([decipher.update(raw.subarray(12, -16)), decipher.final()]); },
  };
  const loadVault = loader({ 'expo-crypto': crypto, '@/api/config': { API_BASE: 'https://qa.invalid/api/v2' }, '@react-native-async-storage/async-storage': { getItem: async k => storage.get(k) ?? null, setItem: async (k,v) => { if (writesFail) throw new Error('disk'); storage.set(k,v); }, removeItem: async k => storage.delete(k) }, 'expo-secure-store': { getItemAsync: async k => secrets.get(k) ?? null, setItemAsync: async (k,v) => secrets.set(k,v), deleteItemAsync: async k => secrets.delete(k) } }, { TextEncoder, TextDecoder });
  return { ...loadVault('src/tracker/vault.ts'), storage, secrets, failWrites: () => { writesFail = true; } };
}
test('vault serializes full concurrent transactions and never exposes supplement text at rest', async () => {
  const v = vaultHarness(); const key = v.partitionFor('A');
  await Promise.all(Array.from({length: 8}, (_, i) => v.transactTracker(key, d => { d.plans.push(plan({ id: `p${i}` })); })));
  assert.equal((await v.loadTracker(key)).plans.length, 8);
  assert.ok([...v.storage.values()].every(raw => !raw.includes('Магний') && !raw.includes('anchorDay')));
  assert.equal(v.secrets.size, 1);
});
test('missing key, tampering and wrong owner AAD fail visibly without deleting ciphertext', async () => {
  const v = vaultHarness(); await v.transactTracker(v.partitionFor('A'), d => { d.plans.push(plan()); });
  const [[dataKey, raw]] = [...v.storage]; const [[secretKey, secret]] = [...v.secrets];
  v.secrets.delete(secretKey); await assert.rejects(v.loadTracker(v.partitionFor('A')), /Ключ/); assert.equal(v.storage.get(dataKey), raw);
  v.secrets.set(secretKey, secret); v.storage.set(dataKey, raw.slice(0, -5) + 'AAAA='); await assert.rejects(v.loadTracker(v.partitionFor('A')), /открыть/);
  v.storage.set(dataKey, raw); await v.transactTracker(v.partitionFor('B'), () => {});
  const bKey = [...v.storage.keys()].find(k => k !== dataKey); const bSecret = [...v.secrets.keys()].find(k => k !== secretKey); v.storage.set(bKey, raw); v.secrets.set(bSecret, secret);
  await assert.rejects(v.loadTracker(v.partitionFor('B')), /открыть/);
});
test('account deletion waits for prior writes, purges key+ciphertext, rejects stale writes', async () => {
  const v = vaultHarness(); const key = v.partitionFor('A'); await v.transactTracker(key, d => { d.plans.push(plan()); });
  await v.purgeTracker(key); assert.equal(v.storage.size, 0); assert.equal(v.secrets.size, 0); await assert.rejects(v.transactTracker(key, () => {}), /удалён/);
});
test('stale open form retains its original revision rather than overwriting a refreshed remote plan', () => {
  const data = { ...engine.emptyTracker(), plans: [plan({ revision: 2, note: 'Remote edit' })] };
  engine.savePlan(data, input({ title: 'My edit', note: 'Old note' }), 'plan', 'edit', false, '2026-10-23T08:00:00Z', 1);
  assert.equal(data.pending[0].operation.expectedRevision, 1);
});
test('explicit deleted-course recovery preserves pending actual marks in a new ID', async () => {
  const h = harness(); h.setData({ ...engine.emptyTracker(), plans: [plan()], plansKnown: true, cells: [{ planId: 'plan', day: '2026-10-22', slot: '08:00', taken: true, revision: 1, takenAt: '2026-10-22T08:00:00Z' }] }); h.offline = true;
  const s = createTrackerStore(h.deps); await s.reload(); await s.setTaken('plan', '2026-10-23', '09:00', true); await s.sync();
  h.remote = snapshot([], []); h.offline = false; h.conflict = true; await s.sync();
  const id = s.getState().data.pending[0].operation.operationId;
  h.offline = true; await s.resolveConflict(id, 'local'); await s.sync();
  const create = s.getState().data.pending[0].operation;
  assert.equal(create.action, 'create'); assert.notEqual(create.planId, 'plan'); assert.equal(create.initialLogs.length, 2); assert.equal(engine.project(s.getState().data).cells[0].taken, true);
});
test('semantic no-op ack does not lend a foreign revision to dependent offline unmark', () => {
  const data = { ...engine.emptyTracker(), plans: [plan()], cells: [{ planId: 'plan', day: '2026-10-23', slot: '09:00', taken: false, revision: 1, takenAt: '2026-10-23T07:00:00Z' }] };
  engine.markTaken(data, 'plan', '2026-10-23', '09:00', true, 'mark', false, '2026-10-23T08:00:00Z', '2026-10-23');
  engine.markTaken(data, 'plan', '2026-10-23', '09:00', false, 'unmark', false, '2026-10-23T08:00:01Z', '2026-10-23');
  engine.acknowledge(data, { operationId: 'mark', acknowledgedRevision: 1, currentPlan: plan(), currentCell: { ...data.cells[0], taken: true, revision: 4 } });
  assert.equal(data.pending[0].operation.expectedRevision, 1); assert.notEqual(data.pending[0].operation.expectedRevision, 4);
});
test('enabling reminders cannot continue into another account after the permission dialog', async () => {
  let epoch = 1; let owner = 'A'; let resolvePermission; const calls = [];
  const permission = new Promise(resolve => { resolvePermission = resolve; });
  const notificationScope = () => ({ epoch, owner });
  const isNotificationScopeCurrent = s => s.epoch === epoch && s.owner === owner;
  const toggle = loadCallback('src/components/tracker/use-reminders.ts', 'toggle', {
    notificationScope, isNotificationScopeCurrent, permission: 'undetermined', plans: [plan({ title: 'A private' })],
    setBusy() {}, setError() {}, setPermission() {}, setEnabled() {}, setScheduled() {}, setNextAt() {}, setUntil() {},
    requestNotificationPermission: () => permission,
    setRemindersEnabled: async (...args) => calls.push(['preference', ...args]),
    syncIntakeReminders: async (...args) => calls.push(['schedule', ...args]), cancelIntakeReminders: async () => calls.push(['cancel']),
  });
  toggle(true); epoch++; owner = 'B'; resolvePermission('granted'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(calls, []);
});
test('lost imported-create ACK plus remote deletion keeps initial history for explicit copy recovery', () => {
  const guest = { ...engine.emptyTracker(), plans: [plan()], cells: [{ planId: 'plan', day: '2026-10-22', slot: '08:00', taken: true, revision: 1, takenAt: '2026-10-22T08:00:00Z' }] };
  const data = engine.emptyTracker(); let n = 0; engine.importGuest(data, guest, () => `id${++n}`);
  const create = data.pending[0].operation;
  engine.savePlan(data, input({ title: 'Edited imported course' }), create.planId, 'edit', false, '2026-10-23T08:00:00Z');
  engine.acknowledge(data, { operationId: create.operationId, acknowledgedRevision: 1, currentPlan: null, currentCell: null });
  assert.equal(engine.project(data).cells.filter(c => c.taken).length, 1);
});
test('repeated snapshots coalesce coverage metadata instead of growing the encrypted vault forever', () => {
  const data = engine.emptyTracker(); for (let i = 0; i < 500; i++) engine.mergeSnapshot(data, snapshot(), '2026-10-23T08:00:00Z');
  assert.equal(data.ranges.length, 1);
});
test('obsolete delivered reminder is acknowledged once, keeps valid group members and never poisons storage', async () => {
  const h = harness(true); h.setData({ ...engine.emptyTracker(), plans: [plan({ isActive: false }), plan({ id: 'active' })] });
  const s = createTrackerStore(h.deps); await s.reload();
  const result = await s.handleNotification({ deliveryId: 'old-delivery', day: '2026-10-23', slot: '09:00', planIds: ['plan', 'active'] });
  assert.equal(result.skipped, 1); assert.equal(s.getState().storageError, null); assert.equal(s.getState().data.handled.length, 1); assert.equal(s.getState().data.cells.length, 1);
  await s.handleNotification({ deliveryId: 'old-delivery', day: '2026-10-23', slot: '09:00', planIds: ['plan', 'active'] });
  assert.equal(s.getState().data.cells[0].taken, true); assert.equal(s.getState().data.handled.length, 1);
  await assert.rejects(s.savePlan(input({ title: '' }), 'bad'), /Проверьте/); assert.equal(s.getState().storageError, null);
});
test('saving an edit after remote deletion queues recoverable update instead of recreating deleted ID', () => {
  const data = engine.emptyTracker(); engine.savePlan(data, input({ title: 'Open form draft' }), 'deleted-id', 'edit', false, '2026-10-23T08:00:00Z', 3);
  assert.equal(data.pending[0].operation.action, 'update'); assert.equal(data.pending[0].operation.expectedRevision, 3); assert.equal(engine.project(data).plans[0].title, 'Open form draft');
});
