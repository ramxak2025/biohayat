/** Dedicated PostgreSQL only; all customer/order fixtures carry a unique synthetic prefix. */
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { copyRecoveryAssets, importRecovery, loadRecovery } from "./catalogue-recovery";

async function main() {
  assert.equal(process.env.LAUNCH_TEST_ALLOW, "1");
  const url = new URL(process.env.DATABASE_URL || "");
  assert.equal(url.hostname, "hayat-commerce-test-postgres"); assert.equal(url.pathname, "/hayat_launch_shop_test");
  Object.assign(globalThis, { AsyncLocalStorage });
  Object.assign(process.env, { NODE_ENV: "test", AUTH_SECRET: "synthetic-auth-".repeat(4), HAYAT_CRM_STATUS_TOKEN: "synthetic-reverse-".repeat(4) });
  const { prisma } = await import("../src/lib/prisma");
  const { applyCrmStatusCommand, getCrmOrderState, CrmStatusError } = await import("../src/lib/crm-order-status");
  const { restoreReservedStock } = await import("../src/lib/order-inventory");
  const { revertOrderBonusOnCancel } = await import("../src/lib/bonus");
  const { NextRequest } = await import("next/server");
  const { IncrementalCache } = await import("next/dist/server/lib/incremental-cache");
  Object.assign(globalThis, { __incrementalCache: new IncrementalCache({ dev: true, requestHeaders: {}, flushToDisk: false,
    maxMemoryCacheSize: 1_000_000, getPrerenderManifest: () => ({ version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [],
      preview: { previewModeId: "test", previewModeEncryptionKey: "test", previewModeSigningKey: "test" } }) }) });
  const { GET: productsV1 } = await import("../src/app/api/v1/products/route");
  const { GET: productsV2 } = await import("../src/app/api/v2/products/route");
  const { GET: statusGet, POST: statusPost } = await import("../src/app/api/crm/order-status/route");
  const { getSortedProducts } = await import("../src/lib/queries");
  const prefix = `synthetic-launch-${randomUUID()}`;
  const events: string[] = []; const orderIds: string[] = []; const wholesaleIds: string[] = [];
  const capture = process.env.CATALOGUE_RECOVERY_DIR || "/capture";
  const recovery = await loadRecovery(capture, path.join(import.meta.dirname, "catalogue-publication.json"));
  const temp = await mkdtemp(path.join(tmpdir(), "hayat-import-test-"));
  let checks = 0;
  const check = async (name: string, task: () => Promise<void>) => { await task(); checks++; console.log(`PASS ${name}`); };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("External HTTP prohibited in this fixture"); };
  try {
    await check("119 products / 225 assets verified; first import exact prices and stock; replay preserves operator edits", async () => {
      await copyRecoveryAssets(recovery, temp); await copyRecoveryAssets(recovery, temp);
      const results = await Promise.all([importRecovery(prisma, recovery), importRecovery(prisma, recovery)]);
      assert.equal(results.reduce((n, r) => n + r.imported, 0), 119);
      assert.equal(await prisma.catalogueRecovery.count(), 119);
      const rows = await prisma.product.findMany({ where: { id: { startsWith: "recovered-wc-" } }, include: { images: true } });
      assert.equal(rows.length, 119); assert.equal(rows.filter(p => p.inStock).length, 108);
      for (const record of recovery.products) {
        const p = rows.find(p => p.id === `recovered-wc-${record.product.sourceId}`)!;
        assert.equal(p.priceKopecks, record.product.priceKopecks); assert.equal(p.direction, record.published.direction);
        assert.equal(p.composition, null); assert.equal(p.usage, null);
        assert.deepEqual(p.images.sort((a,b) => a.sortOrder-b.sortOrder).map(i => i.url), record.mappedImages.map(i => i.url));
      }
      const edited = rows[0]!;
      await prisma.product.update({ where: { id: edited.id }, data: { name: "Operator edit", priceKopecks: 333, stockQty: 7 } });
      const again = await importRecovery(prisma, recovery); assert.equal(again.imported, 0);
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: edited.id } })).priceKopecks, 333);
      const removed = rows[1]!; await prisma.product.delete({ where: { id: removed.id } });
      await importRecovery(prisma, recovery); assert.equal(await prisma.product.findUnique({ where: { id: removed.id } }), null);
    });
    await check("direction query and v1/v2 serializers preserve filters, invalid direction is 400", async () => {
      for (const direction of ["sunna", "semya", "osnova", "sport"] as const) {
        const response = await productsV2(new NextRequest(`https://shop.invalid/api/v2/products?direction=${direction}&take=100`));
        assert.equal(response.status, 200); const body = await response.json();
        assert(body.data.items.length > 0); assert(body.data.items.every((p: { direction: string }) => p.direction === direction));
        const sorted = await getSortedProducts({ direction }, "price-asc");
        assert(sorted.items.length > 0); assert(sorted.items.every(p => p.direction === direction));
        const old = await productsV1(new NextRequest(`https://shop.invalid/api/v1/products?direction=${direction}&perPage=100`));
        assert.equal(old.status, 200); const oldBody = await old.json(); assert(oldBody.data.every((p: { direction: string }) => p.direction === direction));
      }
      assert.equal((await productsV2(new NextRequest("https://shop.invalid/api/v2/products?direction=health"))).status, 400);
      assert.equal((await productsV1(new NextRequest("https://shop.invalid/api/v1/products?direction=SUNNA"))).status, 400);
    });
    const category = await prisma.category.create({ data: { id: `${prefix}-category`, slug: `${prefix}-category`, name: "Synthetic test only" } });
    const product = await prisma.product.create({ data: { id: `${prefix}-product`, slug: `${prefix}-product`, name: "Synthetic test only", categoryId: category.id,
      priceKopecks: 1000, stockQty: 8, badges: [], audiences: [], goals: [], nutrients: [] } });
    const digits = randomUUID().replace(/\D/g, "").padEnd(10, "0").slice(0, 10);
    const customer = await prisma.customer.create({ data: { id: `${prefix}-customer`, phone: `+7${digits}`, name: prefix, passwordHash: "synthetic-unused", bonusKopecks: 1000 } });
    const account = await prisma.wholesaleAccount.create({ data: { id: `${prefix}-wholesale`, phone: `+8${digits}`, name: prefix, company: prefix, passwordHash: "synthetic-unused" } });
    const makeRetail = async () => {
      const order = await prisma.order.create({ data: { id: `${prefix}-${randomUUID()}`, crmProvider: "HAYAT", inventoryVersion: 1, customerId: customer.id,
        customerName: prefix, phone: customer.phone, totalKopecks: 2000, bonusSpentKopecks: 100,
        items: { create: { productId: product.id, name: prefix, priceKopecks: 1000, qty: 2, stockReserved: 2 } } } });
      orderIds.push(order.id); const dealId = randomUUID();
      await prisma.crmOutbox.create({ data: { kind: "retail_order", externalId: order.id, payload: "synthetic fixture", status: "DELIVERED", crmDealId: dealId } });
      return { kind: "retail_order" as const, orderId: order.id, dealId };
    };
    const command = (identity: { kind: "retail_order" | "wholesale_order"; orderId: string; dealId: string }, status: string, expectedRevision: number) => {
      const eventId = randomUUID(); events.push(eventId); return { schemaVersion: 1 as const, eventId, ...identity, expectedRevision, status };
    };
    await check("retail payment/cancel accounting exactly once, immutable replay/conflicting event identity, terminal cancellation", async () => {
      const identity = await makeRetail(); const paid = command(identity, "PAID", 0);
      const result = await applyCrmStatusCommand(paid); assert.equal(result.revision, 1);
      assert.deepEqual(await applyCrmStatusCommand(paid), result);
      assert.equal(await prisma.bonusTransaction.count({ where: { orderId: identity.orderId, reason: "order" } }), 1);
      await assert.rejects(() => applyCrmStatusCommand({ ...paid, status: "CONFIRMED" }), e => e instanceof CrmStatusError && e.code === "event_conflict");
      assert.equal((await applyCrmStatusCommand(command(identity, "SHIPPED", 0))).code, "stale_revision");
      const cancel = command(identity, "CANCELLED", 1); assert.equal((await applyCrmStatusCommand(cancel)).revision, 2);
      await applyCrmStatusCommand(cancel);
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQty, 10);
      assert.equal((await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })).bonusKopecks, 1100);
      assert.equal((await applyCrmStatusCommand(command(identity, "NEW", 2))).code, "terminal");
    });
    await check("customer cancellation vs CRM confirmation race preserves terminal status, revision and one stock restoration", async () => {
      for (let i = 0; i < 8; i++) {
        const identity = await makeRetail(); const before = (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQty!;
        await Promise.all([
          applyCrmStatusCommand(command(identity, "CONFIRMED", 0)),
          prisma.$transaction(async tx => {
            const claim = await tx.order.updateMany({ where: { id: identity.orderId, status: { in: ["NEW", "CONFIRMED"] } }, data: { status: "CANCELLED" } });
            if (claim.count) { await revertOrderBonusOnCancel(tx, identity.orderId); await restoreReservedStock(tx, identity.orderId); }
          }),
        ]);
        const state = await getCrmOrderState(identity); assert.equal(state.status, "CANCELLED"); assert([1, 2].includes(state.revision));
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQty, before + 2);
      }
    });
    await check("wholesale is namespaced, revisions advance for existing admin writers, completion is terminal for CRM", async () => {
      const retail = await makeRetail();
      const row = await prisma.wholesaleOrder.create({ data: { id: retail.orderId, accountId: account.id, crmProvider: "HAYAT", totalKopecks: 4000 } });
      wholesaleIds.push(row.id); const identity = { kind: "wholesale_order" as const, orderId: row.id, dealId: randomUUID() };
      await prisma.crmOutbox.create({ data: { kind: identity.kind, externalId: row.id, payload: "synthetic fixture", status: "DELIVERED", crmDealId: identity.dealId } });
      await prisma.wholesaleOrder.update({ where: { id: row.id }, data: { status: "PROCESSING" } });
      assert.equal((await getCrmOrderState(identity)).revision, 1);
      assert.equal((await applyCrmStatusCommand(command(identity, "DONE", 1))).revision, 2);
      assert.equal((await applyCrmStatusCommand(command(identity, "NEW", 2))).code, "terminal");
      assert.equal((await getCrmOrderState(retail)).status, "NEW");
      await assert.rejects(() => getCrmOrderState({ ...identity, dealId: retail.dealId }), e => e instanceof CrmStatusError && e.httpStatus === 404);
    });
    await check("HTTP reverse auth, kind/status validation and bounded body; unknown or foreign orders remain hidden", async () => {
      assert.equal((await statusGet(new Request("https://shop.invalid/api/crm/order-status"))).status, 401);
      const headers = { Authorization: `Bearer ${process.env.HAYAT_CRM_STATUS_TOKEN}`, "Content-Type": "application/json" };
      const identity = await makeRetail();
      const invalid = command({ ...identity, kind: "wholesale_order" }, "PAID", 0);
      assert.equal((await statusPost(new Request("https://shop.invalid/api/crm/order-status", { method: "POST", headers, body: JSON.stringify(invalid) }))).status, 400);
      assert.equal((await statusPost(new Request("https://shop.invalid/api/crm/order-status", { method: "POST", headers, body: "x".repeat(17000) }))).status, 413);
      const foreign = command({ ...identity, dealId: randomUUID() }, "PAID", 0);
      assert.equal((await statusPost(new Request("https://shop.invalid/api/crm/order-status", { method: "POST", headers, body: JSON.stringify(foreign) }))).status, 404);
    });
    console.log(`${checks} launch data/status groups passed`);
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.crmStatusReceipt.deleteMany({ where: { eventId: { in: events } } });
    await prisma.crmOutbox.deleteMany({ where: { externalId: { in: [...orderIds, ...wholesaleIds] } } });
    await prisma.bonusTransaction.deleteMany({ where: { customerId: `${prefix}-customer` } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.wholesaleOrder.deleteMany({ where: { id: { in: wholesaleIds } } });
    await prisma.customer.deleteMany({ where: { id: `${prefix}-customer` } });
    await prisma.wholesaleAccount.deleteMany({ where: { id: `${prefix}-wholesale` } });
    await prisma.product.deleteMany({ where: { id: `${prefix}-product` } });
    await prisma.category.deleteMany({ where: { id: `${prefix}-category` } });
    await prisma.product.deleteMany({ where: { id: { in: recovery.products.map(p => `recovered-wc-${p.product.sourceId}`) } } });
    await prisma.catalogueRecovery.deleteMany({ where: { sourceId: { in: recovery.products.map(p => p.product.sourceId) } } });
    await prisma.$disconnect(); await rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
