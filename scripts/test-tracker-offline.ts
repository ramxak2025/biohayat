/** Local-only HTTP/Postgres protocol acceptance. Never target production. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
const require = createRequire(import.meta.url);
createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(process.cwd(), true);
const db = new URL(process.env.DATABASE_URL || '');
assert.equal(db.hostname, '127.0.0.1'); assert.equal(db.port, '5434'); assert.equal(db.pathname, '/hayat_shared_data_test');
const prisma = new PrismaClient(); const origin = 'http://localhost:3187';
const phones: string[] = []; const owners: string[] = []; let checks = 0;
function ok(label: string) { checks++; console.log(`PASS ${label}`); }
async function request(path: string, token: string | null, body?: unknown, method = 'POST') {
  const response = await fetch(origin + '/api/v2' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const json = await response.json(); return { status: response.status, ...json };
}
async function account() {
  const phone = '+7' + String(parseInt(randomUUID().slice(0,8),16)).padStart(10,'0'); phones.push(phone);
  const password = `local-${randomUUID()}`;
  const result = await request('/auth/register', null, { name: 'Локальный трекер QA', phone, password, consent: true, consentVersion: '2026-10-22' });
  assert.equal(result.status, 201); owners.push(result.data.customer.id); return { ...result.data, password };
}
async function main() {
  try {
    assert.equal((await request('/tracker/snapshot', null, {})).status, 401); ok('authentication required');
    const a = await account(); const b = await account();
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const get = (type: string) => parts.find(p => p.type === type)!.value; const today = `${get('year')}-${get('month')}-${get('day')}`;
    const snapshot = () => request('/tracker/snapshot', a.token, { from: today, to: today, timeZone: 'Europe/Moscow' });
    const body = { title: 'Локальный Магний', productId: null, anchorDay: today, intervalDays: 4, durationDays: 9, times: ['09:00'], note: null, isActive: true };
    const planId = randomUUID();
    const create = { operationId: randomUUID(), action: 'create', planId, expectedRevision: 0, body };
    const send = (operation: unknown, token = a.token) => request('/tracker/operations', token, { operation, timeZone: 'Europe/Moscow' });
    const created = await Promise.all(Array.from({ length: 6 }, () => send(create)));
    for (const r of created) { assert.equal(r.status, 200); assert.equal(r.data.acknowledgedRevision, 1); }
    assert.equal(await prisma.intakePlan.count({ where: { id: planId } }), 1); assert.equal(await prisma.intakeMutation.count({ where: { customerId: a.customer.id } }), 1);
    ok('parallel duplicate create has one plan and immutable receipt');
    const legacy = await request('/intake?day=' + today, a.token, undefined, 'GET'); assert.equal(legacy.status, 200); assert.equal(legacy.data.some((p: { id: string }) => p.id === planId), false);
    const modern = await request('/intake?capabilities=interval-v1&day=' + today, a.token, undefined, 'GET'); assert.equal(modern.data.some((p: { id: string }) => p.id === planId), true);
    for (const [method, path, payload] of [['PATCH', `/intake/${planId}`, { isActive: false }], ['DELETE', `/intake/${planId}`, undefined], ['POST', `/intake/${planId}/logs`, { day: today, slot: '09:00' }]] as const) {
      const r = await request(path, a.token, payload, method); assert.ok(r.status === 409 || r.status === 400); assert.equal(r.error.code, 'UPGRADE_REQUIRED');
    }
    ok('old clients cannot misread or mutate modern schedules, including cached IDs');
    const foreign = await send({ operationId: randomUUID(), action: 'update', planId, expectedRevision: 1, body: { title: 'FORGED' } }, b.token); assert.equal(foreign.status, 409);
    const foreignSnapshot = await request('/tracker/snapshot', b.token, { from: today, to: today, timeZone: 'Europe/Moscow' }); assert.equal(foreignSnapshot.data.plans.length, 0);
    ok('owner isolation rejects foreign mutations and hides data');
    const mark = { operationId: randomUUID(), action: 'log', planId, expectedRevision: 0, body: { day: today, slot: '09:00', taken: true } };
    const marked = await send(mark); assert.equal(marked.status, 200); assert.equal(marked.data.currentCell.taken, true);
    const equivalent = await send({ ...mark, operationId: randomUUID() }); assert.equal(equivalent.status, 200); assert.equal(equivalent.data.currentCell.revision, 1); assert.equal(equivalent.data.acknowledgedRevision, 0);
    const unmark = await send({ ...mark, operationId: randomUUID(), expectedRevision: 1, body: { ...mark.body, taken: false } }); assert.equal(unmark.status, 200); assert.equal(unmark.data.currentCell.revision, 2);
    const stale = await send({ ...mark, operationId: randomUUID(), expectedRevision: 1 }); assert.equal(stale.status, 409);
    const replay = await send(mark); assert.equal(replay.data.acknowledgedRevision, 1); assert.equal(replay.data.currentCell.taken, false); assert.equal(replay.data.currentCell.revision, 2);
    const snap = await snapshot(); assert.equal(snap.status, 200); assert.equal(snap.data.complete, true); assert.equal(snap.data.cells[0].taken, false);
    ok('desired-state retries never toggle; false-cell ABA and original receipt revision are preserved');
    for (const [expectedRevision, taken] of [[2,true],[3,false],[4,true]] as const) assert.equal((await send({ ...mark, operationId: randomUUID(), expectedRevision, body: { ...mark.body, taken } })).status, 200);
    const noLoan = await send({ ...mark, operationId: randomUUID(), expectedRevision: 2 }); assert.equal(noLoan.status, 200); assert.equal(noLoan.data.acknowledgedRevision, 2); assert.equal(noLoan.data.currentCell.revision, 5);
    assert.equal((await send({ ...mark, operationId: randomUUID(), expectedRevision: noLoan.data.acknowledgedRevision, body: { ...mark.body, taken: false } })).status, 409);
    ok('convergent no-op cannot lend foreign revision to a queued unmark');
    const future = new Date(`${today}T00:00:00Z`); future.setUTCDate(future.getUTCDate()+1);
    assert.equal((await send({ ...mark, operationId: randomUUID(), body: { ...mark.body, day: future.toISOString().slice(0,10) } })).status, 409);
    for (const bad of [{ ...body, intervalDays: 0 }, { ...body, anchorDay: '2026-02-30' }, { ...body, times: ['25:00'] }]) assert.equal((await send({ ...create, operationId: randomUUID(), planId: randomUUID(), body: bad })).status, 400);
    ok('future marks, invalid dates/intervals/times rejected');
    const updates = await Promise.all(['A','B'].map(note => send({ action: 'update', operationId: randomUUID(), planId, expectedRevision: 1, body: { note, times: ['10:00'] } })));
    assert.deepEqual(updates.map(r => r.status).sort(), [200,409]); assert.equal((await prisma.intakeLog.findFirstOrThrow({ where: { planId } })).slot, '09:00');
    ok('concurrent schedule writes use CAS and retain actual old-time history');
    const importedId = randomUUID(); const imported = { ...create, planId: importedId, operationId: randomUUID(), initialLogs: [{ day: today, slot: '08:00', takenAt: new Date().toISOString() }] };
    assert.equal((await send(imported)).status, 200); assert.equal(await prisma.intakeLog.count({ where: { planId: importedId, taken: true } }), 1);
    const invalidImportId = randomUUID(); assert.equal((await send({ ...imported, planId: invalidImportId, operationId: randomUUID(), initialLogs: [{ ...imported.initialLogs[0], day: future.toISOString().slice(0,10) }] })).status, 400); assert.equal(await prisma.intakePlan.count({ where: { id: invalidImportId } }), 0);
    ok('guest history import commits atomically and invalid history rolls back plan creation');
    const legacyPlan = await prisma.intakePlan.create({ data: { customerId: a.customer.id, title: 'Legacy QA', times: ['08:00'], startDate: new Date('2026-10-22T23:30:00Z') } });
    const anchors = await Promise.all(['Europe/Moscow', 'America/Los_Angeles'].map(timeZone => request('/tracker/snapshot', a.token, { from: today, to: today, timeZone })));
    const winning = anchors.map(r => r.data.plans.find((p: { id: string }) => p.id === legacyPlan.id).anchorDay); assert.equal(winning[0], winning[1]); assert.equal((await prisma.intakePlan.findUniqueOrThrow({ where: { id: legacyPlan.id } })).revision, 2);
    await request(`/intake/${legacyPlan.id}/logs`, a.token, { day: today, slot: '08:00' }); await request(`/intake/${legacyPlan.id}/logs`, a.token, { day: today, slot: '08:00' });
    const positive = await request(`/intake/${legacyPlan.id}/logs?from=${today}&to=${today}`, a.token, undefined, 'GET'); assert.equal(positive.data.length, 0);
    ok('first modern timezone binds legacy anchor once; legacy unmark is excluded from positive reads');
    const current = await prisma.intakePlan.findUniqueOrThrow({ where: { id: planId } });
    assert.equal((await send({ action: 'delete', operationId: randomUUID(), planId, expectedRevision: current.revision })).status, 200);
    const afterDelete = await send(create); assert.equal(afterDelete.status, 200); assert.equal(afterDelete.data.currentPlan, null);
    assert.equal((await send({ ...create, operationId: randomUUID() })).status, 409); assert.equal(await prisma.intakePlan.count({ where: { id: planId } }), 0);
    assert.equal((await send({ ...create, body: { ...body, title: 'changed payload' } })).status, 409);
    ok('lost create acknowledgement followed by remote deletion cannot resurrect a plan or reuse receipt payload');
    const deletedAccount = await request('/auth/me', a.token, { password: a.password }, 'DELETE'); assert.equal(deletedAccount.status, 200);
    assert.equal(await prisma.intakePlan.count({ where: { customerId: a.customer.id } }), 0); assert.equal(await prisma.intakeMutation.count({ where: { customerId: a.customer.id } }), 0);
    assert.equal((await snapshot()).status, 401); ok('account deletion clears plans, history and receipts and prevents later mutations');
    console.log(`${checks} grouped tracker protocol checks passed`);
  } finally { await prisma.customer.deleteMany({ where: { id: { in: owners } } }); await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
