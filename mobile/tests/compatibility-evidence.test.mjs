import assert from "node:assert/strict";
import test from "node:test";
import { loader } from "./load-ts.mjs";
const { EVIDENCE_COMPONENTS, EVIDENCE_RULES, COMPATIBILITY_EVIDENCE } = loader()("../src/lib/compatibility-evidence.ts");
const { groupRules, normalizeComponent } = loader()("src/screens/compatibility/rules.ts");
const { collectCourseComponents } = loader({ react: {}, "@tanstack/react-query": {}, "@/api/endpoints": {}, "@/api/keys": {} })("src/screens/compatibility/use-course-import.ts");
test("every offered component has a scoped source note; published pairs are unique and cited", () => {
  assert.equal(EVIDENCE_COMPONENTS.length, 32);
  const names = new Set(EVIDENCE_COMPONENTS.map(c => c.name));
  assert.equal(names.size, 32);
  const pairs = new Set();
  for (const item of [...EVIDENCE_COMPONENTS, ...EVIDENCE_RULES]) {
    assert.ok(item.note.length > 30);
    assert.ok(item.sources.length > 0);
    for (const source of item.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:");
      assert.ok(["ods.od.nih.gov", "www.nccih.nih.gov", "pubmed.ncbi.nlm.nih.gov", "www.fda.gov"].includes(url.hostname));
    }
  }
  for (const rule of EVIDENCE_RULES) {
    assert.ok(names.has(rule.componentA) && names.has(rule.componentB));
    const key = [rule.componentA, rule.componentB].sort().join("|");
    assert.equal(pairs.has(key), false, "No conflicting or reversed duplicate pair"); pairs.add(key);
  }
});
test("a matched pair never supplies information for unrelated unknown pairs", () => {
  const selected = new Set(["Цинк", "Медь", "Коллаген"].map(normalizeComponent));
  const groups = groupRules(EVIDENCE_RULES, selected);
  assert.equal(groups.flatMap(g => g.rules).length, 1);
  assert.equal(groupRules(EVIDENCE_RULES, new Set(["Магний", "Кальций"].map(normalizeComponent))).length, 0);
  const byId = Object.fromEntries(EVIDENCE_RULES.map(r => [r.id, r]));
  assert.equal(byId["zinc-copper"].type, "CAUTION");
  assert.match(byId["zinc-copper"].note, /50 мг/);
  assert.match(byId["iron-zinc"].note, /25 мг/);
  assert.equal(byId["curcumin-piperine"].type, "CAUTION");
  assert.ok(COMPATIBILITY_EVIDENCE.limitations.some(t => t.includes("не подтверждает безопасность")));
});
test("course names use component boundaries and preserve unknown product tags", () => {
  const found = collectCourseComponents([{ title: "Витамин B12", productId: "product" }], { product: ["Неизвестный компонент", "Цинк"] }, ["Витамин B1", "Витамин B12", "Цинк"]);
  assert.equal(found.includes("Витамин B1"), false);
  assert.ok(found.includes("Витамин B12") && found.includes("Цинк") && found.includes("Неизвестный компонент"));
});

test("course import discards private data if session changes during plans or catalog request", async () => {
  const { loadCallback } = await import("./load-ts.mjs");
  for (const boundary of ["plans", "catalog"]) {
    let epoch = 1, release;
    const pending = new Promise(resolve => { release = resolve; });
    let calls = 0;
    const run = loadCallback("src/screens/compatibility/use-course-import.ts", "run", {
      sessionGeneration: () => epoch,
      setImporting() {},
      queryClient: { fetchQuery: () => { calls++; return calls === 1 ? boundary === "plans" ? pending : Promise.resolve([{ title: "PRIVATE A", productId: "a", isActive: true }]) : pending; } },
      qk: {}, CATALOG_NUTRIENTS_KEY: [], api: {}, localDay: () => "2026-10-22", fetchNutrientsByProductId() {}, baseComponents: [], collectCourseComponents,
    });
    const result = run();
    await new Promise(resolve => setImmediate(resolve));
    epoch++;
    release(boundary === "plans" ? [{ title: "PRIVATE A", productId: "a", isActive: true }] : { a: ["Цинк"] });
    await assert.rejects(result, /Сессия изменилась/);
    if (boundary === "plans") assert.equal(calls, 1, "Do not even fetch catalog for an old session");
  }
});

test("late imported titles cannot publish into a new session after the hook resolved", async () => {
  const { loadCallback } = await import("./load-ts.mjs");
  let epoch = 1, release;
  const pending = new Promise(resolve => { release = resolve; });
  const published = [];
  const importFromCourses = loadCallback("src/screens/compatibility/index.tsx", "importFromCourses", {
    sessionGeneration: () => epoch, runImport: () => pending,
    setNotice: value => { if (value) published.push(value); },
    setImportWarnings: value => published.push(value), setCourseComponents: value => published.push(value),
    setSelectedKeys: value => published.push(value), setImportedRanks: value => published.push(value),
    Haptics: {}, normalizeComponent,
  });
  importFromCourses(); epoch++;
  release({ components: ["Цинк"], planCount: 1, unassessedPlans: ["PRIVATE A"], overlappingComponents: [] });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(published, []);
});
