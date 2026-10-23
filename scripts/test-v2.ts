/**
 * Local HTTP contract checks. Start a fresh Next dev server on port 3187 with
 * NEXT_PUBLIC_SITE_URL=http://localhost:3187, then: pnpm exec tsx scripts/test-v2.ts
 * This script never accepts a remote server/database or deletes unrelated data.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// pnpm keeps Next's transitive @next/env inside Next's dependency directory.
const projectRequire = createRequire(`${process.cwd()}/package.json`);
const nextRequire = createRequire(projectRequire.resolve("next/package.json"));
const { loadEnvConfig } = nextRequire("@next/env") as {
  loadEnvConfig: (path: string, dev: boolean) => void;
};
loadEnvConfig(process.cwd(), true);

function assertLocalTestDatabase(raw: string | undefined): string {
  let url: URL;
  try { url = new URL(raw ?? ""); } catch { throw new Error("Missing dedicated test DATABASE_URL"); }
  assert(["postgres:", "postgresql:"].includes(url.protocol), "Test database must be PostgreSQL");
  assert(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Refusing a remote database");
  assert.equal(url.port, "5434", "Refusing a different local database port");
  assert.equal(url.pathname, "/hayat_shared_data_test", "Refusing a non-test database");
  return raw!;
}

const databaseUrl = assertLocalTestDatabase(process.env.DATABASE_URL);
const base = new URL(process.env.V2_TEST_BASE_URL || "http://localhost:3187");
assert.equal(base.protocol, "http:", "Only local HTTP is allowed");
assert(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Refusing a remote HTTP server");
assert.equal(base.port, "3187", "Use the isolated test server on port 3187");
assert.equal(base.pathname, "/", "Test base URL must be an origin");
assert(!base.username && !base.password, "Test origin cannot contain credentials");
const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
const prefix = `v2qa-${randomUUID().slice(0, 8)}`;
const id = (label: string) => `${prefix}-${label}`;
const password = `Test-only-${randomUUID()}`;
const customerIds = [id("alice"), id("bob"), id("inactive"), id("deleted")];
const categoryIds = [id("category"), id("child"), id("hidden-category"), id("bulk-category")];
const productIds = [id("cheap"), id("sale"), id("expensive"), id("hidden"), id("stock"), id("retry")];
const bulkIds = Array.from({ length: 30 }, (_, i) => id(`bulk-${i}`));
const requestKeys: string[] = [];
const webhookToken = `local-only-${randomUUID()}`;
let settingsBefore: { siteName: string; freeDeliveryThresholdKopecks: number; bitrixWebhookToken: string | null } | null = null;
let settingsCreated = false;
let fixturesStarted = false;
let passed = 0;
const failures: string[] = [];

type ObjectValue = Record<string, unknown>;
type HttpResult = { status: number; body: ObjectValue; headers: Headers };
function object(value: unknown): ObjectValue {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), "Expected a JSON object");
  return value as ObjectValue;
}
function array(value: unknown): ObjectValue[] {
  assert(Array.isArray(value), "Expected a JSON array");
  return value.map(object);
}
function value(result: HttpResult): ObjectValue { return object(result.body.data); }
function values(result: HttpResult): ObjectValue[] { return array(result.body.data); }
function itemIds(items: ObjectValue[]): unknown[] { return items.map(item => item.id); }

async function http(path: string, options: { method?: string; token?: string; body?: unknown; cookie?: string } = {}): Promise<HttpResult> {
  const headers: Record<string, string> = { "Cache-Control": "no-cache" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.cookie) headers.Cookie = options.cookie;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(new URL(path, base), {
    method: options.method || "GET", headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: "manual", signal: AbortSignal.timeout(45_000),
  });
  const body = object(await response.json());
  return { status: response.status, body, headers: response.headers };
}
function status(result: HttpResult, expected: number, code?: string): void {
  assert.equal(result.status, expected, `HTTP status: expected ${expected}, received ${result.status}`);
  if (code) assert.equal(object(result.body.error).code, code);
}
async function web(path: string, cookie?: string): Promise<{ status: number; html: string; headers: Headers }> {
  const response = await fetch(new URL(path, base), {
    headers: { ...(cookie ? { Cookie: cookie } : {}), "Cache-Control": "no-cache" },
    redirect: "manual", signal: AbortSignal.timeout(45_000),
  });
  return { status: response.status, html: await response.text(), headers: response.headers };
}
async function check(name: string, run: () => Promise<void>): Promise<void> {
  try {
    await run(); passed++; console.log(`PASS ${name}`);
  } catch (error) {
    const message = error instanceof assert.AssertionError ? error.message : error instanceof Error ? error.name : "Unknown error";
    failures.push(name); console.error(`FAIL ${name}: ${message}`);
  }
}
async function login(customerId: string): Promise<string> {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const response = await http("/api/v2/auth/login", { method: "POST", body: { phone: customer.phone, password } });
  status(response, 200);
  const auth = value(response);
  assert.equal(object(auth.customer).id, customerId);
  assert.equal(typeof auth.token, "string");
  return auth.token as string;
}
async function webLogin(customerId: string): Promise<string> {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const response = await fetch(new URL("/account/login", base), {
    method: "POST", body: new URLSearchParams({ phone: customer.phone, password }),
    redirect: "manual", signal: AbortSignal.timeout(45_000),
  });
  assert.equal(response.status, 303, "Web login redirects after a successful form submission");
  const location = new URL(response.headers.get("location")!, base);
  assert.equal(location.pathname, "/account");
  assert.equal(location.search, "", "Web login cannot redirect to a rate-limit or credentials error");
  const cookies = response.headers.getSetCookie().map(cookie => cookie.split(";")[0]);
  assert(cookies.some(cookie => cookie.startsWith("hayat_customer=")), "Web login must set its customer session cookie");
  return cookies.join("; ");
}
function orderBody(productId: string, expectedTotalKopecks: number, items = [{ id: productId, qty: 1 }]) {
  const requestKey = randomUUID(); requestKeys.push(requestKey);
  return { requestKey, expectedTotalKopecks, customerName: `${prefix} customer`, phone: "+79990000123", consent: true, items };
}

async function fixtures(): Promise<void> {
  const existing = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  assert(!existing?.bitrixEnabled, "Refusing tests while Bitrix integration is enabled");
  settingsBefore = existing ? { siteName: existing.siteName, freeDeliveryThresholdKopecks: existing.freeDeliveryThresholdKopecks, bitrixWebhookToken: existing.bitrixWebhookToken } : null;
  fixturesStarted = true;
  await prisma.siteSettings.upsert({ where: { id: "default" },
    create: { id: "default", siteName: prefix, freeDeliveryThresholdKopecks: 123456, bitrixEnabled: false, bitrixWebhookToken: webhookToken },
    update: { siteName: prefix, freeDeliveryThresholdKopecks: 123456, bitrixEnabled: false, bitrixWebhookToken: webhookToken },
  });
  settingsCreated = !existing;
  const hash = await bcrypt.hash(password, 4);
  const phoneSeed = Number.parseInt(randomUUID().slice(0, 6), 16) % 9_000_000;
  await prisma.customer.createMany({ data: customerIds.map((customerId, i) => ({
    id: customerId, name: customerId, phone: `+7999${String(phoneSeed + i).padStart(7, "0")}`, passwordHash: hash,
  })) });
  await prisma.category.createMany({ data: [
    { id: categoryIds[0], slug: categoryIds[0], name: categoryIds[0], image: "/uploads/v2qa-category.jpg" },
    { id: categoryIds[1], slug: categoryIds[1], name: categoryIds[1], parentId: categoryIds[0] },
    { id: categoryIds[2], slug: categoryIds[2], name: categoryIds[2], isActive: false },
    { id: categoryIds[3], slug: categoryIds[3], name: categoryIds[3] },
  ] });
  const common = { categoryId: categoryIds[0], audiences: ["women"], goals: ["immunity"], nutrients: [prefix], badges: [] };
  await prisma.product.createMany({ data: [
    { ...common, id: productIds[0], slug: productIds[0], name: `${prefix} cheap`, priceKopecks: 10000, isFeatured: true, stockQty: 5, createdAt: new Date("2020-01-01") },
    { ...common, id: productIds[1], slug: productIds[1], name: `${prefix} sale`, priceKopecks: 20000, oldPriceKopecks: 40000, createdAt: new Date("2021-01-01") },
    { ...common, id: productIds[2], slug: productIds[2], name: `${prefix} expensive`, priceKopecks: 30000, oldPriceKopecks: 40000, audiences: ["men"], goals: ["energy"], inStock: false, createdAt: new Date("2022-01-01") },
    { ...common, id: productIds[3], slug: productIds[3], name: `${prefix} hidden`, priceKopecks: 40000, isActive: false },
    { ...common, categoryId: categoryIds[3], id: productIds[4], slug: productIds[4], name: `${prefix} stock`, priceKopecks: 6000, stockQty: 1 },
    { ...common, categoryId: categoryIds[3], id: productIds[5], slug: productIds[5], name: `${prefix} retry`, priceKopecks: 8000, stockQty: 3 },
    ...bulkIds.map((productId, i) => ({ ...common, categoryId: categoryIds[3], id: productId, slug: productId, name: `${prefix} bulk ${i}`, priceKopecks: 100 + i })),
  ] });
  await prisma.productImage.createMany({ data: [
    { productId: productIds[0], url: "/uploads/v2qa-product.jpg" },
    { productId: productIds[1], url: "https://example.com/v2qa-image.jpg" },
  ] });
  await prisma.banner.create({ data: { id: id("banner"), title: prefix, placement: "HERO", image: "/uploads/v2qa-banner.jpg", link: `/catalog?category=${categoryIds[0]}&sort=price_asc` } });
  await prisma.material.createMany({ data: [
    { id: id("article"), slug: id("article"), title: prefix, content: `<p>${prefix} content</p>`, isPublished: true, publishedAt: new Date() },
    { id: id("draft"), slug: id("draft"), title: prefix, content: "draft", isPublished: false },
  ] });
}

async function tests(): Promise<void> {
  // Prove this HTTP server reads the fixture database before any API mutation.
  const probe = await http(`/api/v2/products?ids=${productIds[0]}&take=100`);
  status(probe, 200); assert.deepEqual(itemIds(array(value(probe).items)), [productIds[0]], "HTTP server must read this run's isolated fixtures");

  await check("catalog sort/filter/pagination and image contracts", async () => {
    const catalog = `/api/v2/products?category=${categoryIds[0]}`;
    const first = await http(`${catalog}&sort=price_asc&take=2`); status(first, 200);
    assert.equal(value(first).total, 3); assert.equal(value(first).take, 2); assert.equal(value(first).skip, 0);
    assert.deepEqual(itemIds(array(value(first).items)), productIds.slice(0, 2));
    assert.equal(array(value(first).items)[0].image, `${base.origin}/uploads/v2qa-product.jpg`);
    assert.equal(array(value(first).items)[1].image, "https://example.com/v2qa-image.jpg");
    const second = await http(`${catalog}&sort=price_asc&take=2&skip=2`); status(second, 200);
    assert.deepEqual(itemIds(array(value(second).items)), [productIds[2]]);
    for (const sort of ["price_desc", "new"]) {
      const response = await http(`${catalog}&sort=${sort}`); status(response, 200);
      assert.deepEqual(itemIds(array(value(response).items)), [productIds[2], productIds[1], productIds[0]]);
    }
    const discount = await http(`${catalog}&sort=discount&take=1&skip=1`); status(discount, 200);
    assert.deepEqual(itemIds(array(value(discount).items)), [productIds[2]]); assert.equal(value(discount).total, 3);
    const filtered = await http(`${catalog}&audience=women&goal=immunity&inStock=true&priceFrom=15000&priceTo=25000&onSale=true`); status(filtered, 200);
    assert.deepEqual(itemIds(array(value(filtered).items)), [productIds[1]]);
    const featured = await http(`${catalog}&featured=true&q=${prefix}`); status(featured, 200);
    assert.deepEqual(itemIds(array(value(featured).items)), [productIds[0]]);
    status(await http(`${catalog}&priceFrom=-1`), 400, "VALIDATION");
    status(await http(`${catalog}&priceFrom=20000&priceTo=10000`), 400, "VALIDATION");
  });
  await check("guest IDs recover more than one default page and refresh from database", async () => {
    const response = await http(`/api/v2/products?ids=${bulkIds.join(",")}&take=100`); status(response, 200);
    assert.equal(value(response).total, 30); assert.equal(array(value(response).items).length, 30);
    assert.deepEqual(new Set(itemIds(array(value(response).items))), new Set(bulkIds));
    const route = `/api/v2/products?ids=${productIds[0]},${productIds[3]},missing-${prefix},${productIds[0]}&take=100`;
    const first = await http(route); status(first, 200); assert.deepEqual(itemIds(array(value(first).items)), [productIds[0]]);
    await prisma.product.update({ where: { id: productIds[0] }, data: { priceKopecks: 11000 } });
    const fresh = await http(route); status(fresh, 200); assert.equal(object(array(value(fresh).items)[0].price).kopecks, 11000);
    await prisma.product.update({ where: { id: productIds[0] }, data: { priceKopecks: 10000 } });
    status(await http(`/api/v2/products?ids=${Array.from({ length: 101 }, (_, i) => `x${i}`).join(",")}`), 400, "VALIDATION");
    status(await http("/api/v2/products?ids="), 400, "VALIDATION");
  });
  await check("public categories/settings/content and legacy v1 envelope", async () => {
    const categories = await http("/api/v2/categories"); status(categories, 200);
    const ids = itemIds(values(categories)); assert(ids.includes(categoryIds[0])); assert(!ids.includes(categoryIds[1])); assert(!ids.includes(categoryIds[2]));
    const settings = await http("/api/v2/settings"); status(settings, 200);
    assert.equal(value(settings).siteName, prefix); assert.equal(object(value(settings).freeDeliveryThreshold).kopecks, 123456);
    assert(!/bitrix|password|vapidPrivate|AUTH_SECRET/i.test(JSON.stringify(settings.body)), "Public settings cannot expose secret fields");
    const banners = await http("/api/v2/banners?placement=HERO"); status(banners, 200);
    assert.equal(values(banners).find(item => item.id === id("banner"))?.link, `/catalog?category=${categoryIds[0]}&sort=price_asc`);
    const materials = await http("/api/v2/materials"); status(materials, 200);
    assert(itemIds(values(materials)).includes(id("article"))); assert(!itemIds(values(materials)).includes(id("draft")));
    const article = await http(`/api/v2/materials/${id("article")}`); status(article, 200); assert.equal(value(article).content, `<p>${prefix} content</p>`);
    status(await http(`/api/v2/materials/${id("draft")}`), 404, "NOT_FOUND");
    status(await http(`/api/v2/products/missing-${prefix}`), 404, "NOT_FOUND");
    const legacy = await http(`/api/v1/products?category=${categoryIds[0]}&sort=price_asc&page=2&perPage=2`); status(legacy, 200);
    assert.equal(legacy.body.ok, true); assert.deepEqual(itemIds(array(legacy.body.data)), [productIds[2]]);
    assert.deepEqual(object(legacy.body.meta), { page: 2, perPage: 2, total: 3 });
    assert.equal(legacy.body.error, undefined); assert(!("items" in legacy.body));
  });

  const [alice, bob, inactive, deleted] = await Promise.all(customerIds.map(login));
  const [aliceCookie, bobCookie, inactiveCookie, deletedCookie] = await Promise.all(customerIds.map(webLogin));
  await check("web cookie and v2 share customer/profile while API requires explicit bearer", async () => {
    const me = await http("/api/v2/auth/me", { token: alice }); status(me, 200); assert.equal(value(me).id, customerIds[0]);
    status(await http("/api/v2/auth/me", { cookie: aliceCookie }), 401, "UNAUTHORIZED");
    const renamed = `${prefix} renamed`;
    status(await http("/api/v2/auth/me", { method: "PATCH", token: alice, body: { name: renamed, city: `${prefix} city` } }), 200);
    const row = await prisma.customer.findUniqueOrThrow({ where: { id: customerIds[0] } }); assert.equal(row.name, renamed);
    const profile = await web("/account/profile", aliceCookie); assert.equal(profile.status, 200); assert(profile.html.includes(renamed)); assert(profile.html.includes(`${prefix} city`));
    const account = await web("/account", aliceCookie); assert.equal(account.status, 200); assert(account.html.includes(renamed), "Web must read the updated name instead of stale JWT claims");
    const other = await web("/account/profile", bobCookie); assert.equal(other.status, 200); assert(!other.html.includes(renamed));
  });
  await check("per-item favorites and additive guest merge preserve another client's changes", async () => {
    status(await http(`/api/v2/favorites/${productIds[0]}`, { method: "POST", token: alice }), 200);
    status(await http(`/api/v2/favorites/${productIds[1]}`, { method: "POST", token: alice }), 200);
    status(await http("/api/v2/favorites", { method: "POST", token: alice, body: { productIds: [productIds[2], productIds[2], `missing-${prefix}`] } }), 200);
    let favorites = await http("/api/v2/favorites", { token: alice }); status(favorites, 200);
    assert.deepEqual(new Set(itemIds(values(favorites))), new Set(productIds.slice(0, 3)));
    status(await http("/api/v2/favorites", { method: "POST", token: alice, body: { productIds: [] } }), 200);
    assert.equal(await prisma.favorite.count({ where: { customerId: customerIds[0] } }), 3);
    status(await http(`/api/v2/favorites/${productIds[0]}`, { method: "DELETE", token: alice }), 200);
    status(await http(`/api/v2/favorites/${productIds[1]}`, { method: "POST", token: alice }), 200);
    favorites = await http("/api/v2/favorites", { token: alice }); assert.deepEqual(new Set(itemIds(values(favorites))), new Set(productIds.slice(1, 3)));
    const own = await http("/api/v2/favorites", { token: bob }); status(own, 200); assert.equal(values(own).length, 0);
    // Cards load in FavoritesView's effect; HTTP verifies the authenticated
    // shell here. Browser hydration/interaction needs a separate browser check.
    const webFavorites = await web("/account/favorites", aliceCookie); assert.equal(webFavorites.status, 200); assert(webFavorites.html.includes(`${prefix} renamed`));
  });
  await check("invalid, inactive and deleted sessions cannot access private data or create orders", async () => {
    await prisma.customer.update({ where: { id: customerIds[2] }, data: { isActive: false } });
    await prisma.customer.update({ where: { id: customerIds[3] }, data: { deletedAt: new Date() } });
    for (const token of [undefined, "invalid.jwt.token", inactive, deleted]) {
      for (const path of ["auth/me", "favorites", "orders", "addresses", "intake", "consultations"]) {
        status(await http(`/api/v2/${path}`, { token }), 401, "UNAUTHORIZED");
      }
    }
    const body = orderBody(productIds[0], 10000);
    status(await http("/api/v2/orders", { method: "POST", token: "invalid.jwt.token", body }), 401, "UNAUTHORIZED");
    status(await http("/api/v2/orders", { method: "POST", token: inactive, body }), 401, "UNAUTHORIZED");
    status(await http("/api/v2/orders", { method: "POST", token: deleted, body }), 401, "UNAUTHORIZED");
    assert.equal(await prisma.order.count({ where: { clientRequestKey: body.requestKey } }), 0);
    for (const cookie of [inactiveCookie, deletedCookie]) {
      const profile = await web("/account/profile", cookie);
      // Next's streaming layout emits a redirect meta tag after HTTP headers
      // are sent; without streaming the same redirect has HTTP status 307.
      if (profile.status === 307) assert.equal(new URL(profile.headers.get("location")!, base).pathname, "/account");
      else {
        assert.equal(profile.status, 200);
        assert(/<meta[^>]+http-equiv="refresh"[^>]+content="\d+;url=\/account"/.test(profile.html), "Revoked web session must redirect to account login");
      }
      assert(!profile.html.includes(customerIds[2]) && !profile.html.includes(customerIds[3]), "Revoked session cannot render private fixture profiles");
    }
    const inactiveCustomer = await prisma.customer.findUniqueOrThrow({ where: { id: customerIds[2] } });
    status(await http("/api/v2/auth/login", { method: "POST", body: { phone: inactiveCustomer.phone, password } }), 401);
  });
  await check("addresses enforce owner and one default across simultaneous writes", async () => {
    const created = await Promise.all(["home", "work"].map(label => http("/api/v2/addresses", { method: "POST", token: alice, body: { city: `${prefix} city`, street: `${prefix} ${label}`, label, recipient: "Test recipient", house: "7" } })));
    created.forEach(response => status(response, 201));
    const ids = created.map(response => value(response).id as string);
    let addresses = await prisma.customerAddress.findMany({ where: { customerId: customerIds[0] } });
    assert.equal(addresses.length, 2); assert.equal(addresses.filter(address => address.isDefault).length, 1);
    const defaults = await Promise.all(ids.map(addressId => http(`/api/v2/addresses/${addressId}/default`, { method: "POST", token: alice })));
    defaults.forEach(response => status(response, 200));
    addresses = await prisma.customerAddress.findMany({ where: { customerId: customerIds[0] } }); assert.equal(addresses.filter(address => address.isDefault).length, 1);
    for (const [method, suffix, body] of [["PATCH", "", { city: "foreign" }], ["DELETE", "", undefined], ["POST", "/default", undefined]] as const) {
      status(await http(`/api/v2/addresses/${ids[0]}${suffix}`, { method, token: bob, body }), 404, "NOT_FOUND");
    }
    const foreignOrder = { ...orderBody(productIds[0], 10000), addressId: ids[0] };
    status(await http("/api/v2/orders", { method: "POST", token: bob, body: foreignOrder }), 404, "NOT_FOUND");
    assert.equal(await prisma.order.count({ where: { clientRequestKey: foreignOrder.requestKey } }), 0);
    const patch = await http(`/api/v2/addresses/${ids[0]}`, { method: "PATCH", token: alice, body: { label: "updated" } }); status(patch, 200);
    assert.equal(value(patch).house, "7"); assert.equal(value(patch).recipient, "Test recipient");
    const page = await web("/account/addresses", aliceCookie); assert.equal(page.status, 200); assert(page.html.includes(`${prefix} home`));
    const currentDefault = addresses.find(address => address.isDefault)!;
    status(await http(`/api/v2/addresses/${currentDefault.id}`, { method: "DELETE", token: alice }), 200);
    const remaining = await prisma.customerAddress.findMany({ where: { customerId: customerIds[0] } }); assert.equal(remaining.length, 1); assert.equal(remaining[0].isDefault, true);
  });
  await check("orders reject whole invalid cart, stale total and duplicate lines with no stock change", async () => {
    const before = await prisma.product.findUniqueOrThrow({ where: { id: productIds[0] } });
    const cases = [
      { body: orderBody(productIds[0], 50000, [{ id: productIds[0], qty: 1 }, { id: productIds[3], qty: 1 }]), status: 409, code: "CART_CHANGED" },
      { body: orderBody(productIds[0], 10001), status: 409, code: "PRICE_CHANGED" },
      { body: orderBody(productIds[0], 20000, [{ id: productIds[0], qty: 1 }, { id: productIds[0], qty: 1 }]), status: 400, code: "VALIDATION" },
      { body: orderBody(productIds[0], 10000, [{ id: `missing-${prefix}`, qty: 1 }]), status: 409, code: "CART_CHANGED" },
      { body: orderBody(productIds[0], 40000, [{ id: productIds[0], qty: 1 }, { id: productIds[2], qty: 1 }]), status: 409, code: "CART_CHANGED" },
      { body: orderBody(productIds[0], 60000, [{ id: productIds[0], qty: 6 }]), status: 409, code: "CART_CHANGED" },
    ];
    for (const test of cases) {
      status(await http("/api/v2/orders", { method: "POST", token: alice, body: test.body }), test.status, test.code);
      assert.equal(await prisma.order.count({ where: { clientRequestKey: test.body.requestKey } }), 0);
    }
    const after = await prisma.product.findUniqueOrThrow({ where: { id: productIds[0] } }); assert.equal(after.stockQty, before.stockQty);
  });
  await check("stock concurrency cannot oversell and order uses trusted database prices", async () => {
    const bodies = [orderBody(productIds[4], 6000), orderBody(productIds[4], 6000)];
    const responses = await Promise.all(bodies.map((body, i) => http("/api/v2/orders", { method: "POST", token: i ? bob : alice, body: { ...body, items: body.items.map(item => ({ ...item, priceKopecks: 1 })) } })));
    assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
    status(responses.find(response => response.status === 409)!, 409, "CART_CHANGED");
    const orders = await prisma.order.findMany({ where: { clientRequestKey: { in: bodies.map(body => body.requestKey) } }, include: { items: true } });
    assert.equal(orders.length, 1); assert.equal(orders[0].totalKopecks, 6000); assert.equal(orders[0].items[0].priceKopecks, 6000); assert.equal(orders[0].bitrixSyncStatus, "DISABLED");
    const stock = await prisma.product.findUniqueOrThrow({ where: { id: productIds[4] } }); assert.equal(stock.stockQty, 0); assert.equal(stock.inStock, false);
    const ownToken = orders[0].customerId === customerIds[0] ? alice : bob;
    const foreignToken = ownToken === alice ? bob : alice;
    status(await http(`/api/v2/orders/${orders[0].number}`, { token: ownToken }), 200);
    status(await http(`/api/v2/orders/${orders[0].number}`, { token: foreignToken }), 404, "NOT_FOUND");
    status(await http(`/api/v2/orders/${orders[0].number}/cancel`, { method: "POST", token: foreignToken }), 404, "NOT_FOUND");
    const foreignList = await http("/api/v2/orders", { token: foreignToken }); status(foreignList, 200); assert(!itemIds(values(foreignList)).includes(orders[0].id));
    const page = await web("/account/orders", ownToken === alice ? aliceCookie : bobCookie); assert.equal(page.status, 200); assert(page.html.includes(`${prefix} stock`));
  });
  await check("requestKey retry deduplicates and a changed payload cannot reuse the key", async () => {
    const body = orderBody(productIds[5], 8000);
    const first = await http("/api/v2/orders", { method: "POST", token: bob, body }); status(first, 201);
    const retry = await http("/api/v2/orders", { method: "POST", token: bob, body }); status(retry, 200);
    assert.equal(value(retry).id, value(first).id); assert.equal(value(retry).number, value(first).number);
    status(await http("/api/v2/orders", { method: "POST", token: bob, body: { ...body, comment: "changed" } }), 409, "CONFLICT");
    assert.equal(await prisma.order.count({ where: { clientRequestKey: body.requestKey } }), 1);
    const stock = await prisma.product.findUniqueOrThrow({ where: { id: productIds[5] } }); assert.equal(stock.stockQty, 2);
    const cancelled = await Promise.all([1, 2].map(() => http(`/api/v2/orders/${value(first).number}/cancel`, { method: "POST", token: bob })));
    assert.equal(cancelled.filter(response => response.status === 200).length, 1);
    assert.equal(cancelled.filter(response => response.status === 409).length, 1);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productIds[5] } })).stockQty, 3, "Concurrent cancellation restores stock once");
  });
  await check("same-key last-stock replay, historical cancellation and terminal webhook", async () => {
    await prisma.product.update({ where: { id: productIds[5] }, data: { stockQty: 1, inStock: true } });
    const body = orderBody(productIds[5], 8000);
    const concurrent = await Promise.all([1, 2].map(() => http("/api/v2/orders", { method: "POST", token: bob, body })));
    for (const response of concurrent) assert([200, 201].includes(response.status));
    assert.equal(value(concurrent[0]).id, value(concurrent[1]).id);
    assert.equal(await prisma.order.count({ where: { clientRequestKey: body.requestKey } }), 1);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productIds[5] } })).stockQty, 0);
    const number = value(concurrent[0]).number;
    status(await http(`/api/v2/orders/${number}/cancel`, { method: "POST", token: bob }), 200);
    const notification = await http("/api/bitrix/webhook", { method: "POST", token: webhookToken, body: { orderNumber: number, status: "CONFIRMED" } });
    status(notification, 200); assert.equal(notification.body.updated, 0);
    status(await http(`/api/v2/orders/${number}/cancel`, { method: "POST", token: bob }), 409);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productIds[5] } })).stockQty, 1);
    const legacy = await prisma.order.create({ data: { customerId: customerIds[1], customerName: prefix, phone: "+79990000123", totalKopecks: 16000,
      items: { create: { productId: productIds[5], name: prefix, priceKopecks: 8000, qty: 2 } } } });
    status(await http(`/api/v2/orders/${legacy.number}/cancel`, { method: "POST", token: bob }), 409, "LEGACY_ORDER");
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productIds[5] } })).stockQty, 1);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: legacy.id } })).status, "NEW");
  });
  await check("intake and logs share web records and protect ownership", async () => {
    const day = "2026-10-05";
    const created = await http(`/api/v2/intake?day=${day}`, { method: "POST", token: alice, body: { productId: productIds[1], title: `${prefix} intake`, times: ["21:00", "09:00", "09:00"], durationDays: 30 } }); status(created, 201);
    const planId = value(created).id as string; assert.deepEqual(value(created).times, ["09:00", "21:00"]);
    status(await http(`/api/v2/intake/${planId}/logs`, { method: "POST", token: bob, body: { day, slot: "09:00" } }), 404, "NOT_FOUND");
    status(await http(`/api/v2/intake/${planId}`, { method: "PATCH", token: bob, body: { title: "foreign" } }), 404, "NOT_FOUND");
    const marked = await http(`/api/v2/intake/${planId}/logs`, { method: "POST", token: alice, body: { day, slot: "09:00" } }); status(marked, 200); assert.equal(value(marked).taken, true);
    assert.equal(await prisma.intakeLog.count({ where: { planId, day, slot: "09:00" } }), 1);
    status(await http(`/api/v2/intake/${planId}/logs`, { method: "POST", token: alice, body: { day, slot: "10:00" } }), 400, "VALIDATION");
    const list = await http(`/api/v2/intake?day=${day}`, { token: alice }); status(list, 200); assert.equal(list.headers.get("x-intake-day"), day); assert.equal(array(values(list).find(item => item.id === planId)!.logs).length, 1);
    status(await http(`/api/v2/intake/${planId}?day=${day}`, { method: "PATCH", token: alice, body: { title: `${prefix} edited`, note: "updated" } }), 200);
    assert.equal(await prisma.intakeLog.count({ where: { planId } }), 1, "Editing a course preserves its logs");
    const page = await web("/account/intake", aliceCookie); assert.equal(page.status, 200); assert(page.html.includes(`${prefix} edited`));
    const unmarked = await http(`/api/v2/intake/${planId}/logs`, { method: "POST", token: alice, body: { day, slot: "09:00" } }); status(unmarked, 200); assert.equal(value(unmarked).taken, false); assert.equal(await prisma.intakeLog.count({ where: { planId, taken: true } }), 0);
    const negative = await prisma.intakeLog.findFirstOrThrow({ where: { planId, day, slot: "09:00" } }); assert.equal(negative.taken, false); assert.equal(negative.revision, 2);
    const positiveRead = await http(`/api/v2/intake/${planId}/logs?from=${day}&to=${day}`, { token: alice }); status(positiveRead, 200); assert.equal(values(positiveRead).length, 0);
    const pair = await Promise.all([1, 2].map(() => http(`/api/v2/intake/${planId}/logs`, { method: "POST", token: alice, body: { day, slot: "21:00" } })));
    for (const response of pair) status(response, 200);
    assert.deepEqual(pair.map(response => value(response).taken).sort(), [false, true]);
    assert.equal(await prisma.intakeLog.count({ where: { planId, day, slot: "21:00", taken: true } }), 0);
    assert.equal((await prisma.intakeLog.findFirstOrThrow({ where: { planId, day, slot: "21:00" } })).revision, 2);

  });
  await check("consultations create the same customer-linked record used by web", async () => {
    const created = await http("/api/v2/consultations", { method: "POST", token: alice, body: { topic: `${prefix} consultation`, message: `${prefix} message` } }); status(created, 201);
    const consultation = await prisma.consultationRequest.findUniqueOrThrow({ where: { id: value(created).id as string } });
    assert.equal(consultation.customerId, customerIds[0]); assert.equal(consultation.name, `${prefix} renamed`); assert.equal(consultation.bitrixSyncStatus, "DISABLED");
    const list = await http("/api/v2/consultations", { token: alice }); status(list, 200); assert(itemIds(values(list)).includes(consultation.id));
    const other = await http("/api/v2/consultations", { token: bob }); status(other, 200); assert.equal(values(other).length, 0);
    const page = await web("/account/consultation", aliceCookie); assert.equal(page.status, 200); assert(page.html.includes(`${prefix} consultation`)); assert(page.html.includes(`${prefix} message`));
  });
}

async function cleanup(): Promise<void> {
  if (!fixturesStarted) return;
  // Exact run-owned customer IDs and request keys; no prefix-wide or empty deletion.
  await prisma.order.deleteMany({ where: { OR: [{ clientRequestKey: { in: requestKeys } }, { customerId: { in: customerIds } }] } });
  await prisma.consultationRequest.deleteMany({ where: { customerId: { in: customerIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  await prisma.product.deleteMany({ where: { id: { in: [...productIds, ...bulkIds] } } });
  await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
  await prisma.banner.deleteMany({ where: { id: id("banner") } });
  await prisma.material.deleteMany({ where: { id: { in: [id("article"), id("draft")] } } });
  if (settingsCreated) await prisma.siteSettings.deleteMany({ where: { id: "default", siteName: prefix } });
  else if (settingsBefore) await prisma.siteSettings.update({ where: { id: "default" }, data: settingsBefore });
  assert.equal(await prisma.customer.count({ where: { id: { in: customerIds } } }), 0);
  assert.equal(await prisma.product.count({ where: { id: { in: [...productIds, ...bulkIds] } } }), 0);
  console.log("Scoped fixture cleanup passed");
}

async function main(): Promise<void> {
  console.log("Dedicated local database and HTTP origin guards passed");
  try {
    await fixtures(); await tests();
  } catch (error) {
    failures.push("setup/runner");
    console.error(`FAIL setup/runner: ${error instanceof assert.AssertionError ? error.message : error instanceof Error ? error.name : "Unknown error"}`);
  } finally {
    try { await cleanup(); } catch { failures.push("fixture cleanup"); console.error("FAIL scoped fixture cleanup; inspect exact test fixture IDs"); }
    await prisma.$disconnect();
  }
  console.log(`${passed} checks passed; ${failures.length} failed${failures.length ? `: ${failures.join(", ")}` : ""}`);
  if (failures.length) process.exitCode = 1;
}
void main();
