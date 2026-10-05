import assert from "node:assert/strict";
import test from "node:test";
import { dehydrate } from "@tanstack/react-query";
import { loader, loadCallback } from "./load-ts.mjs";

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const person = id => ({ id, name: id, phone: "+79990000000", email: null, city: null, bonusBalance: 0, createdAt: "2026-01-01" });
const loginResult = id => ({ token: `token-${id}`, customer: person(id), expiresInSec: 300 });
function authHarness(fetch) {
  const storage = new Map();
  const asyncStorage = { removeItem: async k => storage.delete(k), getItem: async k => storage.get(k) ?? null, setItem: async (k,v) => storage.set(k,v) };
  const api = { auth: { login: async body => loginResult(body.phone), register: async body => loginResult(body.phone), me: async () => person("A") } };
  const load = loader({
    "expo-secure-store": { getItemAsync: asyncStorage.getItem, setItemAsync: asyncStorage.setItem, deleteItemAsync: asyncStorage.removeItem },
    "@react-native-async-storage/async-storage": asyncStorage,
    "@react-native-community/netinfo": { addEventListener: () => () => {} },
    "react-native": { AppState: { addEventListener: () => ({ remove() {} }) } },
    "@/api/endpoints": { api },
  }, { fetch, console });
  const auth = load("src/store/auth.ts").useAuth;
  const client = load("src/api/client.ts");
  const cache = load("src/lib/query-client.ts");
  const keys = load("src/api/keys.ts").qk;
  return { auth, api, client, cache, keys, storage, load };
}

test("late A profile cannot overwrite B or the persisted secure record", async () => {
  const h = authHarness();
  try {
    await h.auth.getState().login({ phone: "A", password: "test" });
    const pending = deferred(); h.api.auth.me = () => pending.promise;
    const refresh = h.auth.getState().refreshProfile();
    await h.auth.getState().logout();
    await h.auth.getState().login({ phone: "B", password: "test" });
    pending.resolve(person("A")); await refresh;
    assert.equal(h.auth.getState().customer.id, "B");
    assert.equal(h.auth.getState().token, "token-B");
    const saved = [...h.storage.entries()].find(([key]) => key.startsWith("hayat.session.v2."));
    assert.equal(JSON.parse(saved[1]).customer.id, "B");
  } finally { h.cache.queryClient.clear(); }
});

test("late A 401 cannot log out B; current 401 clears all private state", async () => {
  const pending = deferred();
  let fetch = () => pending.promise;
  const h = authHarness((...args) => fetch(...args));
  try {
    await h.auth.getState().login({ phone: "A", password: "test" });
    const oldRequest = h.client.apiFetch("/orders");
    await h.auth.getState().login({ phone: "B", password: "test" });
    pending.resolve(Response.json({ error: { code: "UNAUTHORIZED", message: "Expired" } }, { status: 401 }));
    await assert.rejects(oldRequest, e => e.code === "SESSION_CHANGED");
    assert.equal(h.auth.getState().token, "token-B");
    h.cache.queryClient.setQueryData(h.keys.order(123), { private: "B" });
    h.cache.queryClient.setQueryData(h.keys.intakeLogs("plan", "2026-01-01", "2026-01-02"), [{ private: "B" }]);
    fetch = async () => Response.json({ error: { code: "UNAUTHORIZED", message: "Expired" } }, { status: 401 });
    await assert.rejects(h.client.apiFetch("/auth/me"), e => e.code === "UNAUTHORIZED");
    assert.equal(h.auth.getState().token, null);
    assert.equal(h.cache.queryClient.getQueryCache().getAll().length, 0);
  } finally { h.cache.queryClient.clear(); }
});

test("account boundaries change private keys and persistence contains only public data", async () => {
  const h = authHarness();
  try {
    await h.auth.getState().login({ phone: "A", password: "test" });
    const keyA = h.keys.orders;
    h.cache.queryClient.setQueryData(keyA, [{ private: "A" }]);
    h.cache.queryClient.setQueryData(h.keys.products({}), { items: [{ id: "public" }] });
    const disk = dehydrate(h.cache.queryClient, { shouldDehydrateQuery: h.cache.shouldPersistQuery });
    assert.equal(disk.queries.length, 1);
    assert.equal(disk.queries[0].queryKey[0], "products");
    await h.auth.getState().login({ phone: "B", password: "test" });
    assert.notDeepEqual([...h.keys.orders], [...keyA]);
    assert.equal(h.cache.queryClient.getQueryData(keyA), undefined);
    assert.ok(h.cache.queryClient.getQueryData(h.keys.products({})));
    await h.auth.getState().logout();
    assert.equal([...h.storage.keys()].some(key => key.startsWith("hayat.session.v2.")), false);
  } finally { h.cache.queryClient.clear(); }
});

function checkoutHarness() {
  let products = [{ id: "p", inStock: true, price: { kopecks: 100 } }];
  const requests = [], refreshed = [];
  let create = async body => ({ number: 1, total: { kopecks: body.expectedTotalKopecks } });
  let uuid = 0, reads = 0;
  const load = loader({
    "expo-modules-core": { uuid: { v4: () => `test-uuid-${++uuid}` } },
    "@/store/cart": { useCart: { getState: () => ({ refreshProducts: list => refreshed.push(list) }) } },
    "@/api/endpoints": { api: { catalog: { productsByIds: async () => { ++reads; return products; } }, orders: { create: async body => { requests.push(body); return create(body); } } } },
  });
  return { submit: load("src/lib/checkout-request.ts").createCheckoutRequest(),
    ApiError: load("src/api/client.ts").ApiError, requests, refreshed,
    products: value => products = value, create: fn => create = fn, reads: () => reads };
}
const contact = { customerName: "Тест", phone: "+79990000000", consent: true };
const lines = [{ id: "p", priceKopecks: 100, qty: 2 }];

test("unavailable or repriced cart never submits a partial/unconfirmed order", async () => {
  const h = checkoutHarness();
  h.products([]);
  await assert.rejects(h.submit(contact, lines), e => e.code === "CART_CHANGED");
  h.products([{ id: "p", inStock: true, price: { kopecks: 200 } }]);
  await assert.rejects(h.submit(contact, lines), e => e.code === "PRICE_CHANGED");
  assert.equal(h.requests.length, 0);
  const result = await h.submit(contact, [{ ...lines[0], priceKopecks: 200 }]);
  assert.equal(h.requests[0].expectedTotalKopecks, 400);
  assert.equal(result.order.total.kopecks, 400);
});

test("uncertain retry retains order key; simultaneous submit is blocked", async () => {
  const h = checkoutHarness();
  h.create(async () => { throw new h.ApiError(0, "timeout"); });
  await assert.rejects(h.submit(contact, lines));
  const key = h.requests[0].requestKey;
  const pending = deferred(); h.create(() => pending.promise);
  const retry = h.submit(contact, lines);
  await assert.rejects(h.submit(contact, lines), e => e.code === "RETRY_REQUEST");
  pending.resolve({ number: 1, total: { kopecks: 200 } });
  await retry;
  assert.equal(h.requests[1].requestKey, key);
  assert.equal(h.reads(), 1);
});


test("delayed manual logout cannot clear a newer account or its private cache", async () => {
  const h = authHarness();
  const pending = deferred();
  h.api.auth.logout = () => pending.promise;
  const performLogout = loadCallback("src/screens/account/index.tsx", "performLogout", {
    api: h.api, logout: () => h.auth.getState().logout(),
    sessionGeneration: h.load("src/lib/session-generation.ts").sessionGeneration,
    Haptics: { notificationAsync() {}, NotificationFeedbackType: { Success: 1 } },
  });
  try {
    await h.auth.getState().login({ phone: "A", password: "test" });
    const oldLogout = performLogout();
    await h.auth.getState().logout();
    await h.auth.getState().login({ phone: "B", password: "test" });
    h.cache.queryClient.setQueryData(h.keys.orders, ["B"]);
    pending.resolve(); await oldLogout;
    assert.equal(h.auth.getState().customer.id, "B");
    assert.deepEqual(h.cache.queryClient.getQueryData(h.keys.orders), ["B"]);
    await performLogout();
    assert.equal(h.auth.getState().token, null);
    assert.equal(h.cache.queryClient.getQueryCache().getAll().length, 0);
  } finally { h.cache.queryClient.clear(); }
});

test("delayed account deletion cannot sign out or navigate a newer account", async () => {
  const h = authHarness();
  const pending = deferred(), effects = [];
  h.api.auth.deleteAccount = () => pending.promise;
  const scope = {
    api: h.api, password: "test", logout: () => h.auth.getState().logout(),
    sessionGeneration: h.load("src/lib/session-generation.ts").sessionGeneration,
    router: { canGoBack: () => true, back: () => effects.push("navigation"), replace: () => effects.push("navigation") },
    Alert: { alert: () => effects.push("alert") },
    setPending() {}, setError: () => effects.push("error"),
    ApiError: h.client.ApiError, errorMessage: e => e.message,
    requestManualDeletion: () => effects.push("manual deletion"),
  };
  scope.finishLogout = loadCallback("src/screens/profile/danger-zone.tsx", "finishLogout", scope);
  const submit = loadCallback("src/screens/profile/danger-zone.tsx", "submit", scope);
  try {
    await h.auth.getState().login({ phone: "A", password: "test" });
    const epochA = scope.sessionGeneration();
    const deletion = submit(); effects.length = 0;
    await h.auth.getState().login({ phone: "B", password: "test" });
    h.cache.queryClient.setQueryData(h.keys.orders, ["B"]);
    pending.resolve(); await deletion;
    await scope.finishLogout(epochA);
    assert.equal(h.auth.getState().customer.id, "B");
    assert.deepEqual(h.cache.queryClient.getQueryData(h.keys.orders), ["B"]);
    assert.deepEqual(effects, []);
  } finally { h.cache.queryClient.clear(); }
});
