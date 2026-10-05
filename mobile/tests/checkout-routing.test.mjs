import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
// Use the exact href resolver installed with Expo Router 57, without loading
// native UI modules or copying its path-resolution behavior into the test.
const { resolveHref, resolveHrefStringWithSegments } = require("expo-router/build/link/href.js");
const checkoutLocation = { segments: ["(tabs)", "cart", "checkout"], params: {} };
const plain = (value) => JSON.parse(JSON.stringify(value));

const staticRoutes = new Set(readdirSync(resolve(mobileRoot, "src/app"), { recursive: true })
  .filter((file) => file.endsWith(".tsx") && !file.includes("[") && !/(^|\/)\+|(^|\/)_layout\.tsx$/.test(file))
  .map((file) => `/${file.replace(/\.tsx$/, "").split("/").filter((part) => !/^\(.+\)$/.test(part)).join("/").replace(/\/index$/, "")}`));
function resolvedUrl(href, options) {
  return new URL(resolveHrefStringWithSegments(resolveHref(href), checkoutLocation, options), "https://hayat.test");
}

function sourceFile(path) {
  return ts.createSourceFile(path, readFileSync(resolve(mobileRoot, path), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function evaluate(node, source, globals) {
  const { outputText } = ts.transpileModule(`exports.run = ${node.getText(source)};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, ...globals });
  return exports.run;
}
function namedCallback(path, name, globals) {
  const source = sourceFile(path);
  let callback;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) {
      callback = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(callback && ts.isArrowFunction(callback), `${path} must define ${name}`);
  return evaluate(callback, source, globals);
}
function pushExpression(path, needle, globals) {
  const source = sourceFile(path);
  let call;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "router.push" && node.getText(source).includes(needle)) call = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(call, `${path} must expose the navigation for ${needle}`);
  evaluate(call, source, globals);
}
function navigation(segments, params = {}) {
  const calls = [];
  return {
    router: { push: (...args) => calls.push(args) },
    destination() {
      assert.equal(calls.length, 1);
      return new URL(resolveHrefStringWithSegments(resolveHref(calls[0][0]), { segments, params }, calls[0][1]), "https://hayat.test");
    },
  };
}

const { outputText: productHrefCode } = ts.transpileModule(readFileSync(resolve(mobileRoot, "src/components/product-card/product-href.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const productHrefExports = {};
vm.runInNewContext(productHrefCode, { exports: productHrefExports });

function completion(currentGeneration = 1) {
  const source = ts.createSourceFile("checkout.tsx", readFileSync(resolve(mobileRoot, "src/screens/checkout/index.tsx"), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "onSuccess") handler = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(handler && ts.isArrowFunction(handler), "Checkout must expose its mutation completion callback");
  const { outputText } = ts.transpileModule(`exports.onSuccess = ${handler.getText(source)};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const calls = [];
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, epoch: 1, sessionGeneration: () => currentGeneration,
    setPlaced: (placed) => calls.push(["placed", placed]),
    consume: (items) => calls.push(["consume", plain(items)]),
    qk: { orders: ["orders"] },
    queryClient: { invalidateQueries: (options) => { calls.push(["invalidate", plain(options)]); return Promise.resolve(); } },
    router: { replace: (...args) => calls.push(["replace", ...plain(args)]) },
  });
  return { onSuccess: exports.onSuccess, calls };
}

const accepted = {
  order: { number: 15, total: { kopecks: 123456 }, statusLabel: "Новая заявка & заказ №15" },
  items: [{ id: "accepted-product", qty: 2 }],
};

test("directory-relative success href resolves below checkout and has no registered route", () => {
  const route = resolvedUrl("./success?number=15", { relativeToDirectory: true });
  assert.equal(route.pathname, "/(tabs)/cart/checkout/success");
  assert.equal(staticRoutes.has(route.pathname.replace("/(tabs)", "")), false);
  assert.equal(staticRoutes.has("/cart/success"), true);
});

test("accepted checkout navigates to the registered success sibling with intact order params", () => {
  const { onSuccess, calls } = completion();
  onSuccess(accepted);
  const navigation = calls.find(([name]) => name === "replace");
  assert.ok(navigation, "Accepted order must navigate to confirmation");
  const route = resolvedUrl(navigation[1], navigation[2]);
  assert.equal(route.pathname, "/cart/success");
  assert.equal(staticRoutes.has(route.pathname), true);
  assert.equal(route.searchParams.get("number"), "15");
  assert.equal(route.searchParams.get("total"), "123456");
  assert.equal(route.searchParams.get("status"), accepted.order.statusLabel);
  assert.deepEqual(calls.slice(0, 3), [["placed", true], ["consume", accepted.items], ["invalidate", { queryKey: ["orders"] }]]);
});

test("completion from a previous session cannot consume cart or navigate", () => {
  const { onSuccess, calls } = completion(2);
  onSuccess(accepted);
  assert.deepEqual(calls, []);
});

test("order list opens a sibling order detail instead of a child below orders", () => {
  const nav = navigation(["(tabs)", "account", "orders"]);
  namedCallback("src/screens/orders/index.tsx", "openOrder", { router: nav.router })({ number: 15 });
  assert.equal(nav.destination().pathname, "/account/order/15");
});

test("article list and related article links stay in the home article stack", () => {
  const slug = "витамины & здоровье";
  for (const [path, segments, params] of [
    ["src/screens/articles/index.tsx", ["(tabs)", "(home)", "articles"], {}],
    ["src/screens/article/index.tsx", ["(tabs)", "(home)", "article", "[slug]"], { slug: "current-article" }],
  ]) {
    const nav = navigation(segments, params);
    namedCallback(path, "openArticle", { router: nav.router })({ slug });
    const destination = nav.destination();
    assert.equal(destination.pathname, `/(tabs)/(home)/article/${encodeURIComponent(slug)}`);
    assert.equal(decodeURIComponent(destination.pathname.split("/").at(-1)), slug, "Slugs must be encoded once");
  }
  const nav = navigation(["(tabs)", "(home)", "article", "[slug]"], { slug: "current-article" });
  namedCallback("src/screens/article/index.tsx", "openArticles", { router: nav.router })();
  assert.equal(nav.destination().pathname, "/(tabs)/(home)/articles");
});

test("compatibility consultation link opens the account sibling", () => {
  const nav = navigation(["(tabs)", "account", "compatibility"]);
  pushExpression("src/screens/compatibility/index.tsx", "consultation", { router: nav.router });
  assert.equal(nav.destination().pathname, "/account/consultation");
});

test("product cards preserve each tab from indexes, favorites and related products", () => {
  const slug = "масло & витамины";
  const contexts = [
    { segments: ["(tabs)", "(home)"], prefix: "./product/", destination: "/(tabs)/(home)/product/" },
    { segments: ["(tabs)", "catalog"], prefix: "./product/", destination: "/(tabs)/catalog/product/" },
    { segments: ["(tabs)", "cart"], prefix: "./product/", destination: "/(tabs)/cart/product/" },
    { segments: ["(tabs)", "account", "favorites"], prefix: "./product/", destination: "/(tabs)/account/product/" },
    ...["(home)", "catalog", "cart", "account"].map(stack => ({ segments: ["(tabs)", stack, "product", "[slug]"], prefix: "./", destination: `/(tabs)/${stack}/product/` })),
  ];
  for (const context of contexts) {
    const nav = navigation(context.segments, { slug: "current-product" });
    namedCallback("src/components/product-card/product-card.tsx", "open", {
      router: nav.router, segments: context.segments, product: { slug }, onPress: undefined,
      hrefPrefix: context.prefix, productHref: productHrefExports.productHref,
    })();
    const destination = nav.destination();
    assert.equal(destination.pathname, `${context.destination}${encodeURIComponent(slug)}`, `Product card context: ${context.segments.join("/")}`);
    assert.equal(decodeURIComponent(destination.pathname.split("/").at(-1)), slug);
  }
});

test("already correct home, catalog and cart index navigation keeps its directory", () => {
  for (const [segments, href, expected] of [
    [["(tabs)", "(home)"], "./articles", "/(tabs)/(home)/articles"],
    [["(tabs)", "(home)"], "./article/example", "/(tabs)/(home)/article/example"],
    [["(tabs)", "catalog"], "./product/example", "/(tabs)/catalog/product/example"],
    [["(tabs)", "cart"], "./product/example", "/(tabs)/cart/product/example"],
  ]) {
    assert.equal(resolveHrefStringWithSegments(href, { segments }, { relativeToDirectory: true }), expected);
  }
});
