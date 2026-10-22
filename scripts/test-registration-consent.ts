/** Local-only HTTP/DB acceptance checks; never run against production. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
const req = createRequire(`${process.cwd()}/package.json`);
createRequire(req.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd(), true);
async function main() {
const db = new URL(process.env.DATABASE_URL || "");
assert.equal(db.hostname, "127.0.0.1"); assert.equal(db.port, "5434"); assert.equal(db.pathname, "/hayat_shared_data_test");
const prisma = new PrismaClient();
const origin = "http://localhost:3187";
const suffix = String(Number.parseInt(randomUUID().slice(0, 7), 16)).padStart(10, "0");
const phone = `+7${suffix}`;
const otherPhone = `+7${String(Number(suffix) + 1).padStart(10, "0")}`;
const thirdPhone = `+7${String(Number(suffix) + 2).padStart(10, "0")}`;
const phones = [phone, otherPhone, thirdPhone];
const password = `local-only-${randomUUID()}`;
let passed = 0;
function ok(label: string) { passed++; console.log(`PASS ${label}`); }
async function post(path: string, body: unknown) {
  return fetch(origin + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), redirect: "manual" });
}
async function web(body: Record<string, string>) {
  return fetch(origin + "/account/register", { method: "POST", body: new URLSearchParams(body), redirect: "manual" });
}
const common = { name: "Локальный QA", phone, password };
try {
  for (const extra of [{}, { consent: false, consentVersion: "2026-10-22" }, { consent: true }, { consent: true, consentVersion: "old" }]) {
    const response = await post("/api/v2/auth/register", { ...common, ...extra });
    assert.equal(response.status, 400); assert.equal((await response.json()).error.code, "CONSENT_REQUIRED");
    assert.equal(await prisma.customer.count({ where: { phone } }), 0);
  }
  ok("v2 absent, false and stale consent rejected before creating accounts");
  const start = Date.now();
  const response = await post("/api/v2/auth/register", { ...common, consent: true, consentVersion: "2026-10-22", acceptedAt: "1970-01-01", registrationConsent: { channel: "forged" } });
  assert.equal(response.status, 201);
  const account = await prisma.customer.findUniqueOrThrow({ where: { phone } });
  const receipt = account.registrationConsent as Record<string, string>;
  assert.equal(receipt.version, "2026-10-22"); assert.equal(receipt.channel, "mobile-v2");
  assert.ok(Date.parse(receipt.acceptedAt) >= start && Date.parse(receipt.acceptedAt) <= Date.now());
  const payload = (await response.json()).data; assert.equal(payload.customer.id, account.id); assert.ok(payload.token);
  assert.equal(payload.customer.registrationConsent, undefined);
  ok("v2 explicit choice creates atomic server-timed receipt without exposing private audit fields");
  const v1bad = await post("/api/v1/auth/register", { ...common, phone: otherPhone }); assert.equal(v1bad.status, 400);
  const v1good = await post("/api/v1/auth/register", { ...common, phone: otherPhone, consent: true, consentVersion: "2026-10-22" }); assert.equal(v1good.status, 201);
  assert.equal((await prisma.customer.findUniqueOrThrow({ where: { phone: otherPhone } })).registrationConsent && ((await prisma.customer.findUniqueOrThrow({ where: { phone: otherPhone } })).registrationConsent as Record<string, string>).channel, "mobile-v1");
  ok("v1 cannot bypass the manual-choice contract");
  const form = { name: common.name, phone: thirdPhone, password, consentVersion: "2026-10-22" };
  const unchecked = await web(form); assert.equal(unchecked.status, 303); assert.match(unchecked.headers.get("location") || "", /no_consent/);
  assert.equal(await prisma.customer.count({ where: { phone: thirdPhone } }), 0);
  const checked = await web({ ...form, consent: "on" }); assert.equal(checked.status, 303); assert.equal(checked.headers.get("location"), "/account");
  assert.equal(((await prisma.customer.findUniqueOrThrow({ where: { phone: thirdPhone } })).registrationConsent as Record<string, string>).channel, "web");
  const cookie = checked.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  const page = await fetch(origin + "/account/compatibility", { headers: { Cookie: cookie } });
  const html = await page.text(); assert.equal(page.status, 200); assert.ok(html.includes("Недостаточно данных") || html.includes("Выберите минимум"));
  ok("website requires explicit choice and shares account access with the API");
  const evidence = (await (await fetch(origin + "/api/v2/compatibility/evidence")).json()).data;
  const rules = (await (await fetch(origin + "/api/v2/compatibility/rules")).json()).data;
  const components = (await (await fetch(origin + "/api/v2/compatibility/components")).json()).data;
  assert.equal(evidence.version, "2026-10-22"); assert.equal(evidence.components.length, 32); assert.deepEqual(rules, evidence.rules); assert.deepEqual(components, evidence.components.map((c: { name: string }) => c.name));
  ok("one reviewed evidence version feeds website and both API adapters");
  const consent = await fetch(origin + "/personal-data-consent"); assert.equal(consent.status, 200); assert.ok((await consent.text()).includes("2026-10-22"));
  ok("separate versioned consent document is publicly readable");
  console.log(`${passed} grouped acceptance checks passed`);
} finally {
  await prisma.customer.deleteMany({ where: { phone: { in: phones }, name: common.name } });
  await prisma.$disconnect();
}

}
main().catch(error => { console.error(error); process.exitCode = 1; });
