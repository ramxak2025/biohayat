/**
 * DB-backed acceptance/outbox regressions; never accepts a production database.
 * TSX_TSCONFIG_PATH=scripts/tsconfig.crm-tests.json pnpm exec tsx scripts/test-crm-outbox.ts
 * Test config resolves Next's server-only marker to its actual server implementation.
 * All fetch calls are trapped; only the dedicated PostgreSQL fixture is contacted.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { spawn } from "node:child_process";
import type { CrmEvent } from "../src/lib/crm-transport";

async function main() {
  assert.equal(process.env.CRM_TEST_ALLOW, "1", "Explicit isolated-test acknowledgement required");
  const database = new URL(process.env.DATABASE_URL || "");
  assert(["postgres:", "postgresql:"].includes(database.protocol));
  assert.equal(database.hostname, "hayat-commerce-test-postgres");
  assert.equal(database.port, "5432");
  assert.equal(database.pathname, "/hayat_shop_crm_test");
  const timezoneWorker = process.argv[2] === "--timezone";
  if (timezoneWorker) { database.searchParams.set("connection_limit", "1"); process.env.DATABASE_URL = database.toString(); }
  Object.assign(globalThis, { AsyncLocalStorage });
  Object.assign(process.env, {
    NODE_ENV: "test", CRM_PROVIDER: "hayat", HAYAT_CRM_URL: "https://crm.invalid",
    HAYAT_CRM_TOKEN: "test-source-token-000000000000000000000000000000",
    CRM_DRAIN_TOKEN: "test-drain-token-000000000000000000000000000000",
    AUTH_SECRET: "test-auth-secret-000000000000000000000000000000",
  });
  const { prisma } = await import("../src/lib/prisma");
  const { enqueueCrmEvent, deliverNextCrmEvent, retryCrmDelivery } = await import("../src/lib/crm-outbox");
  const fetchBefore = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected network request in isolated test"); };
  if (timezoneWorker) {
    try {
      await prisma.$executeRawUnsafe("SET TIME ZONE 'Europe/Moscow'");
      const identity = { kind: "consultation", externalId: process.argv[3] };
      assert.equal(await deliverNextCrmEvent(identity), false, "Future UTC backoff became eligible in non-UTC session");
      const future = new Date(Date.now() + 3_600_000);
      await prisma.crmOutbox.update({ where: { kind_externalId: identity }, data: { status: "PROCESSING", leaseToken: "test-lease", leaseExpiresAt: future } });
      assert.equal(await deliverNextCrmEvent(identity), false, "Future UTC lease expired in non-UTC session");
      console.log("PASS non-UTC database session preserves future backoff and lease");
    } finally { await prisma.$disconnect(); }
    return;
  }

  const prefix = `crm-test-${randomUUID().slice(0, 8)}`;
  let passed = 0;
  async function check(name: string, run: () => Promise<unknown>) {
    await run(); passed++; console.log(`PASS ${name}`);
  }
  const { NextRequest } = await import("next/server");
  const { createRequestStoreForAPI } = await import("next/dist/server/async-storage/request-store");
  const { createWorkStore } = await import("next/dist/server/async-storage/work-store");
  const { workAsyncStorage } = await import("next/dist/server/app-render/work-async-storage.external");
  const { workUnitAsyncStorage } = await import("next/dist/server/app-render/work-unit-async-storage.external");
  const { IncrementalCache } = await import("next/dist/server/lib/incremental-cache");
  Object.assign(globalThis, { __incrementalCache: new IncrementalCache({
    dev: true, requestHeaders: {}, flushToDisk: false, maxMemoryCacheSize: 1_000_000,
    getPrerenderManifest: () => ({ version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: {
      previewModeId: "test", previewModeEncryptionKey: "test", previewModeSigningKey: "test",
    } }),
  }) });
  async function inRequest<T>(cookie: string, run: () => Promise<T>, cacheAvailable = true): Promise<T> {
    const req = new NextRequest("https://shop.invalid/test", { headers: { cookie, referer: "https://shop.invalid/cart" } });
    const store = createRequestStoreForAPI(req, { pathname: "/test", search: "" }, { tags: [], expirationsByCacheKind: new Map() }, undefined, undefined);
    const closeCallbacks: (() => void)[] = [];
    const pending: Promise<unknown>[] = [];
    // Next 16.2 checks BOTH stores before allowing headers()/cookies(). A request
    // store alone is insufficient even when its AsyncLocalStorage is active.
    const work = createWorkStore({
      page: "/test/route", buildId: "test", deploymentId: "test", previouslyRevalidatedTags: [],
      renderOpts: {
        cacheComponents: false, supportsDynamicResponse: true, isPossibleServerAction: true,
        experimental: { isRoutePPREnabled: false, authInterrupts: false },
        waitUntil: promise => { pending.push(promise); },
        onClose: callback => { closeCallbacks.push(callback); }, onAfterTaskError: undefined,
      },
    });
    // Fault injection affects the cache only; real headers, cookies and auth still
    // execute inside Next's native stores with the actual signed fixture cookie.
    if (!cacheAvailable) Object.defineProperty(work, "incrementalCache", { value: undefined });
    try { return await workAsyncStorage.run(work, () => workUnitAsyncStorage.run(store, run)); }
    finally { for (const callback of closeCallbacks) callback(); await Promise.all(pending); }
  }
  function request(path: string, body: unknown, token?: string) {
    return new NextRequest(`https://shop.invalid${path}`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": randomUUID(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  }
  const payloads = new Map<string, string>();
  const dealIds = new Map<string, string>();
  const acknowledge: typeof fetch = async (url, init) => {
    assert.equal(String(url), "https://crm.invalid/api/integrations/v1/events/biohayat");
    assert.equal(init?.redirect, "manual");
    const body = String(init?.body);
    const event = JSON.parse(body) as CrmEvent;
    const identity = `${event.kind}:${event.externalId}`;
    if (payloads.has(identity)) assert.equal(payloads.get(identity), body, "Retry mutated the acceptance snapshot");
    const duplicate = dealIds.has(identity);
    payloads.set(identity, body);
    if (!duplicate) dealIds.set(identity, `deal-${randomUUID()}`);
    return Response.json({ accepted: true, kind: event.kind, externalId: event.externalId, dealId: dealIds.get(identity), duplicate }, { status: duplicate ? 200 : 201 });
  };
  const { POST: orderV1 } = await import("../src/app/api/v1/orders/route");
  const { POST: orderV2 } = await import("../src/app/api/v2/orders/route");
  const { POST: consultationV2 } = await import("../src/app/api/v2/consultations/route");
  const { submitOrder } = await import("../src/app/actions/order");
  const { submitConsultation } = await import("../src/app/(site)/account/consultation/actions");
  const { submitWholesaleRequest } = await import("../src/app/opt/(cabinet)/actions");
  const { signCustomerToken } = await import("../src/lib/api/token");
  const { SignJWT } = await import("jose");
  try {
    await check("Next fixture preserves real request context across await and outside-request guards", async () => {
      const { headers, cookies } = await import("next/headers");
      await assert.rejects(async () => headers(), /outside a request scope/);
      await inRequest("fixture=context", async () => {
        assert.equal((await headers()).get("referer"), "https://shop.invalid/cart");
        await Promise.resolve();
        assert.equal((await cookies()).get("fixture")?.value, "context");
      });
    });
    const category = await prisma.category.create({ data: { slug: `${prefix}-category`, name: "CRM test fixture" } });
    const product = await prisma.product.create({ data: {
      slug: `${prefix}-product`, name: "Fixture product", categoryId: category.id, priceKopecks: 10_000, stockQty: 100,
      wholesaleTiers: { create: { minQty: 10, priceKopecks: 8_000 } },
    } });
    const digits = randomUUID().replace(/\D/g, "").padEnd(10, "0").slice(0, 10);
    const customer = await prisma.customer.create({ data: { name: `${prefix}-customer`, phone: `+7${digits}`, passwordHash: "unused-test-password-hash", bonusKopecks: 5_000 } });
    const token = await signCustomerToken({ sub: customer.id, name: customer.name, phone: customer.phone });
    const cookie = `hayat_customer=${token}`;
    const promo = await prisma.promoCode.create({ data: { code: prefix, discountType: "FIXED", value: 1_000 } });
    const wholesale = await prisma.wholesaleAccount.create({ data: { name: prefix, company: "Fixture company", phone: `+8${digits}`, passwordHash: "unused", status: "APPROVED", city: "Test city", inn: "1234567890" } });
    const b2b = await new SignJWT({ sub: wholesale.id, name: wholesale.name, company: wholesale.company, kind: "b2b" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
    const ids: string[] = [];
    globalThis.fetch = acknowledge;

    await check("website accepts once despite address lookup, cache and receipt-write failures; prices/stock/discount/bonus stay authoritative", async () => {
      const fd = new FormData();
      for (const [key, value] of Object.entries({ customerName: `${prefix}-web`, phone: customer.phone, address: "Test city, Test street", saveAddress: "on", consent: "true", promoCode: promo.code, bonusSpend: "3000", items: JSON.stringify([{ id: product.id, name: "forged", priceKopecks: 1, qty: 2 }]) })) fd.set(key, value);
      const findAddress = prisma.customerAddress.findFirst;
      const writeReceipt = prisma.crmOutbox.updateMany;
      Object.assign(prisma.customerAddress, { findFirst: () => { throw new Error("injected address lookup failure"); } });
      Object.assign(prisma.crmOutbox, { updateMany: () => { throw new Error("injected receipt persistence failure"); } });
      try {
        const response = await inRequest(cookie, () => submitOrder({ ok: false }, fd), false);
        assert.equal(response.ok, true);
        const order = await prisma.order.findUniqueOrThrow({ where: { number: response.orderNumber! }, include: { items: true } });
        ids.push(order.id);
        assert.equal(order.totalKopecks, 16_000); assert.equal(order.discountKopecks, 1_000); assert.equal(order.bonusSpentKopecks, 3_000);
        assert.equal(order.items[0].priceKopecks, 10_000); assert.equal(order.items[0].stockReserved, 2);
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQty, 98);
        assert.equal((await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })).bonusKopecks, 2_000);
        assert.equal((await prisma.promoCode.findUniqueOrThrow({ where: { id: promo.id } })).usedCount, 1);
        const job = await prisma.crmOutbox.findUniqueOrThrow({ where: { kind_externalId: { kind: "retail_order", externalId: order.id } } });
        assert.equal(job.status, "PROCESSING");
        const event = JSON.parse(job.payload) as CrmEvent;
        assert.equal(event.channel, "web"); assert.equal(event.order?.subtotalKopecks, 20_000);
        assert.equal(await prisma.order.count({ where: { customerName: `${prefix}-web` } }), 1);
      } finally {
        Object.assign(prisma.customerAddress, { findFirst: findAddress });
        Object.assign(prisma.crmOutbox, { updateMany: writeReceipt });
      }
    });

    await check("v1 keeps response contract and queues authoritative mobile snapshot", async () => {
      const result = await orderV1(request("/api/v1/orders", { customerName: `${prefix}-v1`, phone: customer.phone, consent: true, items: [{ productId: product.id, qty: 2 }] }));
      assert.equal(result.status, 201);
      const body = await result.json() as { data: { orderId: string; totalKopecks: number } };
      assert.equal(body.data.totalKopecks, 20_000); ids.push(body.data.orderId);
      const job = await prisma.crmOutbox.findUniqueOrThrow({ where: { kind_externalId: { kind: "retail_order", externalId: body.data.orderId } } });
      assert.equal((JSON.parse(job.payload) as CrmEvent).channel, "api_v1"); assert.equal(job.status, "DELIVERED");
    });

    await check("v2 accepts despite unavailable cache and replays once without additional inventory/outbox", async () => {
      const data = { requestKey: randomUUID(), expectedTotalKopecks: 10_000, customerName: `${prefix}-v2`, phone: customer.phone, consent: true, items: [{ id: product.id, qty: 1 }] };
      const result = await orderV2(request("/api/v2/orders", data));
      assert.equal(result.status, 201);
      const body = await result.json() as { data: { id: string; total: { kopecks: number } } };
      ids.push(body.data.id);
      const replay = await orderV2(request("/api/v2/orders", data));
      assert.equal(replay.status, 200);
      assert.equal((await replay.json() as { data: { id: string } }).data.id, body.data.id);
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQty, 97);
      assert.equal(await prisma.crmOutbox.count({ where: { externalId: body.data.id } }), 1);
      assert.equal((await orderV2(request("/api/v2/orders", { ...data, customerName: "changed" }))).status, 409);
    });

    await check("website and v2 consultations commit with unchanged response and no invented consent", async () => {
      const fd = new FormData(); fd.set("message", `${prefix}-web-question`);
      assert.equal((await inRequest(cookie, () => submitConsultation({}, fd))).ok, true);
      const saved = await prisma.consultationRequest.findFirstOrThrow({ where: { message: `${prefix}-web-question` } }); ids.push(saved.id);
      const job = await prisma.crmOutbox.findUniqueOrThrow({ where: { kind_externalId: { kind: "consultation", externalId: saved.id } } });
      assert.equal((JSON.parse(job.payload) as CrmEvent).consent, undefined);
      const freshRead = prisma.consultationRequest.findUnique;
      Object.assign(prisma.consultationRequest, { findUnique: () => { throw new Error("postcommit fresh read must not run"); } });
      try {
        const result = await consultationV2(request("/api/v2/consultations", { message: `${prefix}-mobile-question` }, token));
        assert.equal(result.status, 201);
        const body = await result.json() as { data: { id: string; message: string } }; ids.push(body.data.id);
        assert.equal(body.data.message, `${prefix}-mobile-question`);
      } finally { Object.assign(prisma.consultationRequest, { findUnique: freshRead }); }
    });

    await check("approved wholesale source queues tier prices and full company snapshot without altering stock", async () => {
      const result = await inRequest(`hayat_b2b=${b2b}`, () => submitWholesaleRequest({ items: [{ productId: product.id, qty: 10 }], comment: prefix }));
      assert(result.ok);
      const order = await prisma.wholesaleOrder.findUniqueOrThrow({ where: { number: result.number } }); ids.push(order.id);
      const job = await prisma.crmOutbox.findUniqueOrThrow({ where: { kind_externalId: { kind: "wholesale_order", externalId: order.id } } });
      const event = JSON.parse(job.payload) as CrmEvent;
      assert.equal(event.contact.inn, wholesale.inn); assert.equal(event.contact.company, wholesale.company);
      assert(event.order);
      assert.equal(event.order.totalKopecks, 80_000); assert.equal(event.order.items[0].qty, 10);
      assert.equal(event.order.items[0].priceKopecks, 8_000);
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQty, 97);
      assert.equal(await prisma.crmOutbox.count({ where: { externalId: { in: ids } } }), 6);
    });

    await check("outbox insertion failure rolls back accepted v2 order and stock reservation", async () => {
      const functionName = `crm_test_${randomUUID().replaceAll("-", "")}`;
      const failName = `${prefix}-reject`;
      await prisma.$executeRawUnsafe(`CREATE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.payload::jsonb->>'title' LIKE '%${failName}%' THEN RAISE EXCEPTION 'injected outbox rejection'; END IF; RETURN NEW; END $$`);
      await prisma.$executeRawUnsafe(`CREATE TRIGGER "${functionName}" BEFORE INSERT ON "CrmOutbox" FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`);
      try {
        const result = await orderV2(request("/api/v2/orders", { requestKey: randomUUID(), expectedTotalKopecks: 10_000, customerName: failName, phone: customer.phone, consent: true, items: [{ id: product.id, qty: 1 }] }));
        assert.equal(result.status, 500);
        assert.equal(await prisma.order.count({ where: { customerName: failName } }), 0);
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQty, 97);
      } finally {
        await prisma.$executeRawUnsafe(`DROP TRIGGER "${functionName}" ON "CrmOutbox"`);
        await prisma.$executeRawUnsafe(`DROP FUNCTION "${functionName}"()`);
      }
    });

    await check("expired uncertain receipt replays frozen snapshot despite provider and source edits", async () => {
      const identity = { kind: "retail_order", externalId: ids[0] };
      const job = await prisma.crmOutbox.findUniqueOrThrow({ where: { kind_externalId: identity } });
      await prisma.order.update({ where: { id: ids[0] }, data: { customerName: "Edited after acceptance" } });
      await prisma.crmOutbox.update({ where: { id: job.id }, data: { leaseExpiresAt: new Date(0) } });
      process.env.CRM_PROVIDER = "bitrix";
      assert.equal(await deliverNextCrmEvent(identity), true);
      const receipt = await prisma.crmOutbox.findUniqueOrThrow({ where: { id: job.id } });
      assert.equal(receipt.status, "DELIVERED"); assert.equal(receipt.payload, job.payload);
      assert.equal(receipt.crmDealId, dealIds.get(`${identity.kind}:${identity.externalId}`));
      const attempts = receipt.attempts; await retryCrmDelivery(job.id);
      assert.equal((await prisma.crmOutbox.findUniqueOrThrow({ where: { id: job.id } })).attempts, attempts);
      process.env.CRM_PROVIDER = "hayat";
    });

    function event(suffix: string): CrmEvent {
      return { schemaVersion: 1, kind: "consultation", externalId: `${prefix}-${suffix}`, occurredAt: new Date().toISOString(), channel: "web", title: "Queue fixture", contact: { name: "Fixture", phone: "+79000000000" } };
    }
    await check("concurrent drains obtain one lease; a stale worker cannot overwrite a newer successful receipt", async () => {
      const snapshot = event("concurrent");
      await prisma.$transaction(tx => enqueueCrmEvent(tx, snapshot));
      const identity = { kind: snapshot.kind, externalId: snapshot.externalId };
      let release!: () => void; let observed!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const started = new Promise<void>(resolve => { observed = resolve; });
      let calls = 0;
      globalThis.fetch = async (url, init) => {
        calls++;
        if (calls === 1) { observed(); await gate; return new Response(null, { status: 503 }); }
        return acknowledge(url, init);
      };
      const oldWorker = deliverNextCrmEvent(identity);
      await started;
      assert((await Promise.all(Array.from({ length: 5 }, () => deliverNextCrmEvent(identity)))).every(claim => claim === false));
      assert.equal(calls, 1);
      await prisma.crmOutbox.update({ where: { kind_externalId: identity }, data: { leaseExpiresAt: new Date(0) } });
      assert.equal(await deliverNextCrmEvent(identity), true);
      release(); await oldWorker;
      const job = await prisma.crmOutbox.findUniqueOrThrow({ where: { kind_externalId: identity } });
      assert.equal(job.status, "DELIVERED"); assert.equal(job.attempts, 2); assert.equal(job.lastError, null);
      globalThis.fetch = acknowledge;
    });

    await check("future backoff and lease remain ineligible in a non-UTC PostgreSQL session", async () => {
      const snapshot = event("timezone");
      await prisma.$transaction(tx => enqueueCrmEvent(tx, snapshot));
      await prisma.crmOutbox.update({ where: { kind_externalId: { kind: snapshot.kind, externalId: snapshot.externalId } }, data: { status: "RETRY", nextAttemptAt: new Date(Date.now() + 3_600_000) } });
      await new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, [...process.execArgv, process.argv[1], "--timezone", snapshot.externalId], { env: process.env, stdio: "inherit" });
        child.once("error", reject); child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Timezone fixture failed (${code})`)));
      });
    });

    await check("legacy Bitrix callbacks cannot mutate own-CRM orders through number, lead or deal identifiers", async () => {
      const webhookToken = `test-${randomUUID()}`;
      await prisma.siteSettings.upsert({ where: { id: "default" }, create: { id: "default", bitrixWebhookToken: webhookToken, bitrixWebhookUrl: "https://bitrix.invalid/rest/test/", bitrixStageMap: { test: "PAID" } }, update: { bitrixWebhookToken: webhookToken, bitrixWebhookUrl: "https://bitrix.invalid/rest/test/", bitrixStageMap: { test: "PAID" } } });
      const { POST: webhook } = await import("../src/app/api/bitrix/webhook/route");
      const id = `${prefix}-legacy-entity`;
      const managed = await prisma.order.update({ where: { id: ids[0] }, data: { bitrixLeadId: id, bitrixDealId: id } });
      const legacy = await prisma.order.create({ data: { customerName: prefix, phone: customer.phone, totalKopecks: 1_000, bitrixLeadId: id, bitrixDealId: id } });
      const auth = { Authorization: `Bearer ${webhookToken}` };
      for (const identifier of [{ orderNumber: managed.number }, { leadId: id }, { dealId: id }]) {
        const result = await webhook(new NextRequest("https://shop.invalid/api/bitrix/webhook", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ ...identifier, status: "PAID" }) }));
        assert.equal(result.status, 200);
        assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: managed.id } })).status, "NEW");
      }
      assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: legacy.id } })).status, "PAID");
      globalThis.fetch = async () => Response.json({ result: { STAGE_ID: "test", STATUS_ID: "test", LEAD_ID: id } });
      for (const eventName of ["ONCRMLEADUPDATE", "ONCRMDEALUPDATE"]) {
        const body = new URLSearchParams({ event: eventName, "data[FIELDS][ID]": id });
        const result = await webhook(new NextRequest("https://shop.invalid/api/bitrix/webhook", { method: "POST", headers: auth, body }));
        assert.equal(result.status, 200);
        assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: managed.id } })).status, "NEW");
      }
      globalThis.fetch = acknowledge;
    });

    await check("drain token is separate and source API auth remains required", async () => {
      const { POST: drain } = await import("../src/app/api/crm/drain/route");
      assert.equal((await drain(new Request("https://shop.invalid/api/crm/drain", { method: "POST" }))).status, 401);
      assert.equal((await drain(new Request("https://shop.invalid/api/crm/drain", { method: "POST", headers: { Authorization: `Bearer ${process.env.HAYAT_CRM_TOKEN}` } }))).status, 401);
      assert.equal((await consultationV2(request("/api/v2/consultations", { message: "unauthorized" }))).status, 401);
      assert.equal((await orderV2(request("/api/v2/orders", {}, "invalid"))).status, 401);
    });
    console.log(`PASS ${passed} DB-backed CRM regression groups; isolated fixture prefix ${prefix}`);
  } finally {
    globalThis.fetch = fetchBefore;
    await prisma.$disconnect();
    // Fixture rows intentionally remain only in the guarded disposable test DB.
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
