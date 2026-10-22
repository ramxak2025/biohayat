import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const canonical = "https://new.biohayat.ru/api/v2";
const plain = (value) => JSON.parse(JSON.stringify(value));

// Compile installed TypeScript in memory; native dependencies are explicit test boundaries.
function loader(mocks = {}, globals = {}) {
  const modules = new Map();
  function load(path) {
    const full = resolve(mobileRoot, path);
    if (modules.has(full)) return modules.get(full).exports;
    const module = { exports: {} };
    modules.set(full, module);
    const { outputText } = ts.transpileModule(readFileSync(full, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: full,
    });
    function importModule(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith(".") || name.startsWith("@/")) {
        const base = name.startsWith("@/") ? resolve(mobileRoot, "src", name.slice(2)) : resolve(dirname(full), name);
        const file = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((candidate) => existsSync(candidate) && /\.tsx?$/.test(candidate));
        assert.ok(file, `Cannot resolve ${name} from ${path}`);
        return load(file);
      }
      return require(name);
    }
    vm.runInNewContext(outputText, {
      exports: module.exports, module, require: importModule,
      process: { env: {} }, URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
      fetch: () => { throw new Error("Network requests must be mocked"); }, ...globals,
    }, { filename: full });
    return module.exports;
  }
  return load;
}

const reactHooks = {
  useMemo: (run) => run(), useCallback: (fn) => fn, useEffect: () => {},
  useRef: (value) => ({ current: value }),
  useState: (value) => [typeof value === "function" ? value() : value, () => {}],
};
const native = { StyleSheet: { create: (styles) => styles }, View: "View", Keyboard: { dismiss() {} }, Platform: { OS: "ios" } };
const theme = { spacing: { sm: 8, md: 12, base: 16, xl: 24 }, radii: {}, Duration: {}, useColors: () => ({ textMuted: "#777" }) };
const ui = Object.fromEntries(["AppText", "Card", "Screen", "EmptyState", "ErrorState", "Button", "BadDisclaimer", "Divider", "ListSkeleton", "Skeleton"].map((name) => [name, name]));
Object.assign(ui, { useDetailScreenOptions: () => ({}) });
const router = { push() {}, navigate() {}, replace() {}, canGoBack: () => false };
function elements(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((item) => elements(item, type));
  return [...(node.type === type ? [node] : []), ...elements(node.props?.children, type)];
}

test("canonical v2 defaults and explicit local origins agree", () => {
  const config = loader()("src/api/config.ts");
  assert.equal(config.API_BASE, canonical);
  assert.equal(config.API_ORIGIN, "https://new.biohayat.ru");
  const local = loader({}, { process: { env: { EXPO_PUBLIC_API_URL: " http://localhost:3010/api/v2/ " } } })("src/api/config.ts");
  assert.equal(local.API_BASE, "http://localhost:3010/api/v2");
  assert.equal(local.API_ORIGIN, "http://localhost:3010");
  const eas = JSON.parse(readFileSync(resolve(mobileRoot, "eas.json"), "utf8"));
  for (const profile of Object.values(eas.build)) assert.equal(profile.env.EXPO_PUBLIC_API_URL, canonical);
  assert.ok(readFileSync(resolve(mobileRoot, ".env.example"), "utf8").includes(`EXPO_PUBLIC_API_URL=${canonical}`));
});

test("external images retain origin while uploaded relative paths resolve", () => {
  const { normalizeImageUrl } = loader()("src/api/client.ts");
  assert.equal(normalizeImageUrl("https://cdn.example.org/photo.png?width=600#preview"), "https://cdn.example.org/photo.png?width=600#preview");
  assert.equal(normalizeImageUrl("/uploads/photo.png"), "https://new.biohayat.ru/uploads/photo.png");
  assert.equal(normalizeImageUrl("uploads/photo.png"), "https://new.biohayat.ru/uploads/photo.png");
  assert.equal(normalizeImageUrl("//cdn.example.org/photo.png"), "https://cdn.example.org/photo.png");
  assert.equal(normalizeImageUrl(null), null);
  assert.equal(normalizeImageUrl("data:image/png;base64,abc"), null);
});

test("structured record 404s preserve their message and code", async () => {
  const { apiFetch } = loader({}, { fetch: async () => Response.json({ error: { code: "NOT_FOUND", message: "Материал не найден" } }, { status: 404 }) })("src/api/client.ts");
  await assert.rejects(apiFetch("/materials/removed", { auth: false }), (error) => {
    assert.equal(error.status, 404);
    assert.equal(error.code, "NOT_FOUND");
    assert.equal(error.message, "Материал не найден");
    assert.equal(error.legacyGap, false);
    return true;
  });
});

test("required sections reject missing routes instead of reporting empty success", async () => {
  const { catalog } = loader({}, { fetch: async () => new Response("Missing route", { status: 404 }) })("src/api/endpoints.ts");
  for (const request of [catalog.taxonomy, catalog.banners, catalog.materials, catalog.compatibilityRules, catalog.compatibilityComponents]) {
    await assert.rejects(request(), (error) => error.status === 404);
  }
});

test("guest IDs recover current products in saved order across batches", async () => {
  const ids = [...Array.from({ length: 101 }, (_, index) => `product-${index}`), "retired", "product-0"];
  const originalIds = [...ids];
  const requests = [];
  const { catalog } = loader({}, { fetch: async (rawUrl) => {
    const url = new URL(rawUrl);
    requests.push(url);
    const batch = url.searchParams.get("ids").split(",");
    const items = batch.filter((id) => id !== "retired").reverse().map((id) => ({ id, slug: id, name: id, price: { kopecks: 150000 }, image: `/uploads/${id}.png`, images: [] }));
    return Response.json({ data: { items, total: items.length, take: 100, skip: 0 } });
  } })("src/api/endpoints.ts");
  assert.deepEqual(plain(await catalog.productsByIds([])), []);
  assert.equal(requests.length, 0);
  const recovered = await catalog.productsByIds(ids);
  assert.deepEqual(plain(recovered.map((product) => product.id)), ids.slice(0, 101));
  assert.equal(recovered[0].price.kopecks, 150000);
  assert.equal(recovered[0].image, "https://new.biohayat.ru/uploads/product-0.png");
  assert.equal(requests.length, 2);
  for (const url of requests) {
    assert.equal(url.pathname, "/api/v2/products");
    assert.ok(url.searchParams.get("ids").split(",").length <= 100);
    assert.equal(url.searchParams.get("take"), "100");
  }
  assert.deepEqual(ids, originalIds);
});

test("guest screen requests persisted IDs without needing catalog cache", () => {
  const calls = [];
  const product = { id: "persisted-product", slug: "current-product" };
  const { FavoritesScreen } = loader({
    react: reactHooks, "react-native": native, "expo-router": { Stack: { Screen: "StackScreen" }, useRouter: () => router },
    "@tanstack/react-query": { useQuery: (options) => { calls.push(options); return calls.length === 2 ? { data: [product], refetch() {} } : {}; } },
    "@/hooks/use-favorites": { useFavorites: () => ({ ids: new Set([product.id]) }) },
    "@/store/auth": { useIsAuthenticated: () => false },
    "@/components/product-card": { ProductGrid: "ProductGrid" }, "@/components/ui": ui, "@/theme": theme,
  })("src/screens/favorites/index.tsx");
  const tree = FavoritesScreen();
  assert.equal(calls[1].enabled, true);
  assert.deepEqual(plain(calls[1].queryKey), ["products", "by-id", [product.id]]);
  assert.deepEqual(elements(tree, "ProductGrid")[0].props.products, [product]);
});

test("banner catalog queries preserve filters and path category takes precedence", () => {
  const calls = [];
  const { useBannerNavigate } = loader({
    react: reactHooks, "expo-router": { useRouter: () => ({ push: (target) => calls.push(plain(target)) }) },
    "expo-web-browser": { openBrowserAsync() {} },
  })("src/components/home/banner-link.ts");
  const navigate = useBannerNavigate();
  navigate("/catalog?category=vitamins&sort=price_asc&inStock=true&priceFrom=0&priceTo=200000&q=%D0%BE%D0%BC%D0%B5%D0%B3%D0%B0&unknown=x");
  assert.deepEqual(calls[0], { pathname: "/catalog", params: { category: "vitamins", q: "омега", sort: "price_asc", inStock: "true", priceFrom: "0", priceTo: "200000" } });
  navigate("/category/oils?category=wrong&sort=price_desc&goal=immunity");
  assert.deepEqual(calls[1], { pathname: "/catalog", params: { category: "oils", goal: "immunity", sort: "price_desc" } });
  navigate("/sale?onSale=false&featured=true");
  assert.deepEqual(calls[2], { pathname: "/catalog", params: { onSale: "true", featured: "true" } });
});

test("catalog consumers apply incoming stock, price, search and underscore sort", () => {
  const { useCatalogFilters } = loader({
    react: reactHooks, "react-native": native,
    "expo-router": { useLocalSearchParams: () => ({ category: "oils", q: " омега ", sort: "price_asc", inStock: "true", priceFrom: "0", priceTo: "200000" }) },
  })("src/components/catalog/use-catalog-filters.ts");
  assert.deepEqual(plain(useCatalogFilters().query), { category: "oils", inStock: "true", priceFrom: 0, priceTo: 200000, q: "омега", sort: "price_asc" });
});

test("search banner query initializes the field and submits actual search", () => {
  const calls = [];
  const { SearchScreen } = loader({
    react: reactHooks, "react-native": native, "expo-haptics": {}, "@/theme": theme,
    "expo-router": { useRouter: () => router, useLocalSearchParams: () => ({ q: " омега " }) },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "@tanstack/react-query": { useQuery: (options) => { calls.push(options); return {}; } },
    "./use-search-history": { useSearchHistory: () => ({}) }, "./use-debounced-value": { useDebouncedValue: (value) => value },
    "./search-field": { SearchField: "SearchField" }, "./search-results": { SearchResults: "SearchResults" },
    "./search-landing": { SearchLanding: "SearchLanding" }, "./suggestion-list": { SuggestionList: "SuggestionList" },
  })("src/screens/search/index.tsx");
  const tree = SearchScreen();
  assert.equal(elements(tree, "SearchField")[0].props.value, "омега");
  assert.equal(elements(tree, "SearchResults")[0].props.query, "омега");
  assert.equal(calls[1].enabled, true);
});

test("compatibility dictionary has no invented fallback and no-match copy stays uncertain", () => {
  const { buildDictionary } = loader()("src/screens/compatibility/rules.ts");
  assert.deepEqual(plain(buildDictionary(undefined, [])), []);
  const { CleanResult } = loader({
    "react-native": native, "expo-symbols": { SymbolView: "SymbolView" }, "@/components/ui": ui, "@/theme": theme,
  })("src/screens/compatibility/clean-result.tsx");
  const tree = CleanResult();
  assert.equal(tree.props.tone, "soft");
  assert.equal(elements(tree, "View").find((element) => element.props.accessible).props.accessibilityLabel,
    "В базе нет сведений об этой комбинации. Это не подтверждает безопасность совместного приёма.");
  assert.deepEqual(elements(tree, "AppText").map((element) => element.props.children), [
    "В базе нет сведений об этой комбинации.", "Это не подтверждает безопасность совместного приёма.",
  ]);
});

test("compatibility errors remain visible even when old rules are cached", () => {
  const error = new Error("Required rules unavailable");
  const { CompatibilityScreen } = loader({
    react: { ...reactHooks, useSyncExternalStore: (_, snapshot) => snapshot() }, "react-native": native, "expo-haptics": {}, "expo-symbols": {}, "expo-web-browser": {},
    "expo-router": { Stack: { Screen: "StackScreen" }, useRouter: () => router },
    "react-native-reanimated": { useReducedMotion: () => true }, "@/components/ui": ui, "@/theme": theme,
    "@/store/auth": { useIsAuthenticated: () => false },
    "./use-compatibility": { useCompatibility: () => ({ dictionary: ["Железо", "Кальций"], rules: [{ componentA: "Железо", componentB: "Кальций", type: "ANTAGONIST" }], error }) },
    "./use-course-import": { useCourseImport: () => ({ run() {} }) },
    "./clean-result": { CleanResult: "CleanResult" }, "./component-picker": { ComponentPicker: "ComponentPicker" },
    "./rule-group": { RuleGroupBlock: "RuleGroupBlock" }, "./scan-summary": { ScanSummary: "ScanSummary" },
  })("src/screens/compatibility/index.tsx");
  const root = CompatibilityScreen();
  const tree = root.type(root.props);
  assert.equal(elements(tree, "ErrorState")[0].props.error, error);
  assert.equal(elements(tree, "CleanResult").length, 0);
});

test("home exposes required banner, offer and settings failures with retry", () => {
  const error = new Error("Required endpoint unavailable");
  const empty = { data: [], refetch() {} };
  const failed = { isError: true, error, refetch() {} };
  const data = { hero: failed, promo: failed, settings: failed, categories: empty, taxonomy: { data: { audiences: [], goals: [] } }, materials: empty, hits: empty, sale: empty };
  const home = Object.fromEntries(["ArticlesRail", "CategoryRail", "HeroCarousel", "HomeChroma", "HomeSection", "PromoStrip", "TaxonomyRail", "TrustBlock"].map((name) => [name, name]));
  Object.assign(home, { useBannerNavigate: () => () => {}, useHeroHeight: () => 400 });
  const { HomeScreen } = loader({
    react: reactHooks,
    "react-native": { ...native, RefreshControl: "RefreshControl" },
    "expo-router": { Stack: { Screen: "StackScreen" }, useRouter: () => router },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    "react-native-reanimated": { ScrollView: "ScrollView", useSharedValue: (value) => ({ value }), useAnimatedScrollHandler: (handler) => handler },
    "@/theme": { ...theme, palette: {} }, "@/components/home": home,
    "@/components/product-card": { ProductStrip: "ProductStrip" }, "@/components/ui": { ...ui, useTabBarInset: () => 0 },
    "./use-home-data": { useHomeData: () => data },
  })("src/screens/home/index.tsx");
  const failures = elements(HomeScreen(), "ErrorState");
  assert.equal(failures.length, 3);
  for (const failure of failures) {
    assert.equal(failure.props.error, error);
    assert.equal(typeof failure.props.onRetry, "function");
  }
});
