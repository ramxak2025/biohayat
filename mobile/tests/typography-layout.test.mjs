import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { loader, loadCallback } from "./load-ts.mjs";

const nbsp = "\u00a0";
const { typesetRussian, typesetTextChildren } = loader()("src/lib/russian-typesetting.ts");

test("Russian short words stay with the next word without creating phrase-long chains", () => {
  assert.equal(typesetRussian("В корзину и в каталог, но не сейчас."), `В${nbsp}корзину и в${nbsp}каталог, но не${nbsp}сейчас.`);
  assert.equal(typesetRussian("С витаминами, а завтра — к врачу."), `С${nbsp}витаминами, а${nbsp}завтра — к${nbsp}врачу.`);
  assert.equal(typesetRussian("Принимать в 50 мг и по 2 таблетки."), `Принимать в 50${nbsp}мг и по 2${nbsp}таблетки.`);
});

test("three-letter prepositions stay with Russian words while chain, unit and identifier guards remain", () => {
  assert.equal(typesetRussian("Без сахара, для ежедневного рациона; над водой, под крышкой, при приёме, про витамины."),
    `Без${nbsp}сахара, для${nbsp}ежедневного рациона; над${nbsp}водой, под${nbsp}крышкой, при${nbsp}приёме, про${nbsp}витамины.`);
  assert.equal(typesetRussian("Для при приёме и под водой; для 50 мг."),
    `Для при${nbsp}приёме и под${nbsp}водой; для 50${nbsp}мг.`);
  const technical = "для qa-type-product; про https://hayat.test/catalog; при api/v2; для support@hayat.test\nпод\nводой";
  assert.equal(typesetRussian(technical), technical);
});

test("decimal quantities, units, percent and order numbers keep their punctuation", () => {
  assert.equal(typesetRussian("1.5 кг; 2,5 мл; 10–20 мг; 25 %; № 15, 60 капсул."),
    `1.5${nbsp}кг; 2,5${nbsp}мл; 10–20${nbsp}мг; 25${nbsp}%; №${nbsp}15, 60${nbsp}капсул.`);
  const money = `123${nbsp}456${nbsp}₽`;
  assert.equal(typesetRussian(money), money);
});

test("paragraphs, indentation, URLs, emails, dates and technical identifiers remain literal", () => {
  const original = "В https://hayat.test/a?q=50%20мг и qa-type-product\n\nНа support@hayat.test\r\n№ AB-123; 2026-10-05; 10.20.30; api/v2\n  В  строке\tс  отступом";
  assert.equal(typesetRussian(original), original);
});

test("typesetting is idempotent and joins adjacent textual children without modifying links", () => {
  const original = "В корзину: 50 мг, № 15.\nНе более 2 таблеток в день.";
  const result = typesetRussian(original);
  assert.equal(typesetRussian(result), result);
  const link = createElement("Link", { href: "/catalog" }, "В каталог");
  const nestedText = createElement("Text", { style: { fontWeight: "700" } }, "50 мг");
  const children = ["В ", ["корзину: ", 50], " мг. ", link, " и ", nestedText];
  const rendered = typesetTextChildren(children);
  assert.equal(rendered[0], `В${nbsp}корзину: 50${nbsp}мг. `);
  assert.equal(rendered[1], link);
  assert.equal(rendered[2], " и ");
  assert.equal(rendered[3], nestedText);
  assert.equal(children[0], "В ", "Source children and API strings must not be mutated");
  assert.equal(link.props.children, "В каталог");
});

const spacing = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, "2xl": 32 };
const colors = { text: "#111", brand: "#166534", textOnBrand: "#fff", brandSoft: "#def", textMuted: "#666" };
const theme = { spacing, radii: {}, shadows: {}, MIN_TAP_SIZE: 44, typography: {}, Spring: {}, Duration: {}, useColors: () => colors };
const native = (os = "ios", width = 402, fontScale = 1) => ({
  Platform: { OS: os }, StyleSheet: { create: (value) => value, hairlineWidth: 0.5 },
  View: "View", ScrollView: "ScrollView", Text: "Text", RefreshControl: "RefreshControl", ActivityIndicator: "Spinner",
  useWindowDimensions: () => ({ width, height: 874, fontScale }),
});
const flatten = (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
function elements(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((item) => elements(item, type));
  return [...(node.type === type ? [node] : []), ...elements(node.props?.children, type)];
}
const hooks = { useCallback: (fn) => fn, useContext: () => 0, useEffect() {}, useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] };

test("native tab footer uses UIKit's full inset once and Android's already-inset content frame", () => {
  for (const [os, inset, inTab, expected] of [["ios", 84, true, 84], ["ios", 34, false, 34], ["android", 24, true, 0], ["android", 24, false, 24], ["ios", 0, true, 0]]) {
    const { useTabBarInset, Screen } = loader({
      react: hooks, "react-native": native(os), "expo-router/react-navigation": { HeaderHeightContext: {} },
      "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: inset }) }, "@/theme": theme,
    })("src/components/ui/screen.tsx");
    assert.equal(useTabBarInset(inTab), expected);
    const tree = Screen({ footer: "Action", withTabBar: inTab });
    const footer = elements(tree, "View").find((item) => flatten(item.props.style).position === "absolute");
    assert.equal(flatten(footer.props.style).paddingBottom, expected);
    if (os === "ios" && inTab) assert.equal(useTabBarInset(inTab) + 8 - inset, 8, "Dock gap must be 8pt, not another tab height");
  }
});

test("AppText applies display spacing and native wrapping while preserving caller overrides", () => {
  const { AppText } = loader({ "react-native": native(), "@/theme": theme })("src/components/ui/app-text.tsx");
  const tree = AppText({ children: ["В корзину: ", 50, " мг"], variant: "body", accessibilityLabel: "В корзину: 50 мг" });
  assert.equal(tree.props.children[0], `В${nbsp}корзину: 50${nbsp}мг`);
  assert.equal(tree.props.accessibilityLabel, "В корзину: 50 мг");
  assert.equal(tree.props.lineBreakStrategyIOS, "standard");
  assert.equal(tree.props.maxFontSizeMultiplier, 1.9);
  const custom = AppText({ children: "В корзину", maxScale: 2, lineBreakStrategyIOS: "none" });
  assert.equal(custom.props.maxFontSizeMultiplier, 2);
  assert.equal(custom.props.lineBreakStrategyIOS, "none");
});

test("long Russian buttons and section headings can grow without hidden labels", () => {
  const common = { "react-native": native(), "expo-symbols": { SymbolView: "Symbol" }, "@/theme": theme, "./app-text": { AppText: "AppText" }, "./press-scale": { PressableScale: "Pressable" } };
  const { Button } = loader(common)("src/components/ui/button.tsx");
  const title = "Добавить комплекс витаминов и минералов в корзину";
  const button = Button({ title, size: "sm", fullWidth: true });
  const label = elements(button, "AppText")[0];
  assert.equal(label.props.children, title);
  assert.equal(label.props.numberOfLines, undefined);
  assert.equal(flatten(button.props.style).height, undefined);
  assert.ok(flatten(button.props.style).minHeight >= 44);
  const { SectionHeader } = loader(common)("src/components/ui/section-header.tsx");
  const heading = "Комплексы витаминов и минералов для ежедневного рациона";
  const section = SectionHeader({ title: heading, subtitle: "Подберите средства для ежедневного рациона", onAction() {} });
  const headingNode = elements(section, "AppText")[0];
  assert.equal(headingNode.props.children, heading);
  assert.equal(headingNode.props.numberOfLines, undefined);
});

test("stepper's individual controls meet native touch sizes and retain quantity behavior", () => {
  for (const os of ["ios", "android"]) for (const size of ["sm", "md"]) {
    const changes = [];
    const { Stepper } = loader({
      "react-native": native(os), "expo-haptics": { selectionAsync() {} }, "expo-symbols": { SymbolView: "Symbol" },
      "@/theme": theme, "./app-text": { AppText: "AppText" }, "./press-scale": { PressableScale: "Pressable" },
    })("src/components/ui/stepper.tsx");
    const controls = elements(Stepper({ value: 2, size, onChange: (next) => changes.push(next) }), "Pressable");
    for (const control of controls) {
      const style = flatten(control.props.style);
      assert.ok(style.width >= (os === "android" ? 48 : 44));
      assert.ok(style.minHeight >= (os === "android" ? 48 : 44));
      control.props.onPress();
    }
    assert.deepEqual(changes, [1, 3]);
  }
});

test("buy bar stacks on narrow screens and enlarged text, with readable available/unavailable states", () => {
  const product = { id: "qa-type-product-large", name: "Комплекс витаминов и минералов для ежедневного рациона, 60 капсул", inStock: true, price: { kopecks: 12345600 }, oldPrice: { kopecks: 15000000 }, image: null };
  const anim = { View: "AnimatedView", useReducedMotion: () => true, useSharedValue: (value) => ({ value }), useAnimatedStyle: (fn) => fn(), LinearTransition: { duration: () => undefined } };
  for (const [width, fontScale, stacked] of [[402, 1, false], [320, 1, true], [375, 1.5, true], [402, 1.9, true]]) {
    for (const inStock of [true, false]) {
      const { ProductBuyBar } = loader({
        react: hooks, "react-native": native("ios", width, fontScale), "react-native-reanimated": { ...anim, default: anim },
        "expo-haptics": {}, "expo-router": { useRouter: () => ({}) }, "expo-symbols": { SymbolView: "Symbol" },
        "@/components/ui": { AppText: "AppText", Button: "Button", GlassSurface: "Glass", Price: "Price", PressableScale: "Pressable", Stepper: "Stepper" },
        "@/components/fx/flight": { useFlyToCart: () => () => {} }, "@/store/cart": { useCart: (select) => select({ lines: [] }) }, "@/theme": theme,
      })("src/components/product/product-buy-bar.tsx");
      const tree = ProductBuyBar({ product: { ...product, inStock } });
      const button = elements(tree, "Button")[0];
      assert.equal(button.props.fullWidth, stacked);
      assert.equal(button.props.title, inStock ? "В корзину" : "Нет в наличии");
      const price = elements(tree, "Price")[0];
      assert.equal(price.props.price.kopecks, 12345600);
      assert.equal(price.props.oldPrice.kopecks, 15000000);
      if (!inStock) {
        const note = elements(tree, "AppText").find((node) => node.props.children.startsWith("Товара сейчас"));
        assert.equal(note.props.numberOfLines, undefined);
      }
    }
  }
});

test("product dock remeasures growing content instead of keeping a fixed footer reservation", () => {
  let height = 0;
  const onLayout = loadCallback("src/screens/product/index.tsx", "onBuyBarLayout", { Math, setBuyBarHeight: (update) => { height = update(height); } });
  onLayout({ nativeEvent: { layout: { height: 156.2 } } });
  assert.equal(height, 157);
  onLayout({ nativeEvent: { layout: { height: 240 } } });
  assert.equal(height, 240, "The expanded note and Dynamic Type footer must reserve its actual height");
  onLayout({ nativeEvent: { layout: { height: 68 } } });
  assert.equal(height, 68, "A collapsed footer must release unused scroll space");
});

const displayLayout = loader()("src/lib/display-layout.ts");

test("hero height keeps intrinsic expanded text below the brand and above the fade without feedback", () => {
  const clearance = 20 + 52 + 16;
  for (const contentHeight of [180, 310, 480, 900]) {
    const height = displayLayout.homeHeroHeight(667, contentHeight, clearance);
    const contentTop = height - Math.round(height * displayLayout.HERO_FADE_RATIO) - 8 - contentHeight;
    assert.ok(contentTop >= clearance - 0.5, "Expanded text must clear the header without clipping");
    assert.equal(displayLayout.homeHeroHeight(667, contentHeight, clearance), height, "Measuring intrinsic content again must not increase the container");
  }
  const baseline = Math.round(667 * 0.55);
  assert.ok(baseline - Math.round(baseline * 0.3) - 8 - 310 < clearance, "The former fixed hero overlaps the header for this text height");
});

const animation = { View: "AnimatedView", ScrollView: "AnimatedScrollView", useReducedMotion: () => true,
  useSharedValue: (value) => ({ value }), useAnimatedStyle: (fn) => fn(), useAnimatedScrollHandler: (fn) => fn };
const homeMocks = (width = 375, fontScale = 1.9) => ({
  react: hooks, "react-native": native("ios", width, fontScale),
  "react-native-reanimated": { ...animation, default: animation },
  "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 20 }) },
  "expo-image": { Image: "Image" }, "expo-symbols": { SymbolView: "Symbol" }, "expo-linear-gradient": { LinearGradient: "Gradient" },
  "@/components/ui": { AppText: "AppText", PressableScale: "Pressable", ErrorState: "ErrorState", Skeleton: "Skeleton" },
  "@/theme": { ...theme, palette: { surface: "#fff", ink: "#111", brand600: "#166534" } },
});
function childComponent(tree, name) {
  function find(node) {
    if (!node || typeof node !== "object") return undefined;
    if (Array.isArray(node)) return node.map(find).find(Boolean);
    if (typeof node.type === "function" && node.type.name === name) return node;
    return find(node.props?.children);
  }
  const child = find(tree);
  assert.ok(child, `Expected ${name}`);
  return child;
}

test("fallback and server banner text remain complete and report only intrinsic text height", () => {
  const measurements = [];
  const opens = [];
  const banner = { id: "qa-hero", title: "Комплекс витаминов и минералов для ежедневного рациона", subtitle: "Подберём курс под возраст, цель и образ жизни", ctaLabel: "В каталог", link: "/catalog?category=vitamins", image: null };
  const { HeroCarousel } = loader(homeMocks())("src/components/home/hero-carousel.tsx");
  for (const banners of [[], [banner]]) {
    const tree = HeroCarousel({ banners, height: 600, scrollY: { value: 0 }, onOpenCatalog: () => opens.push("catalog"), onPressBanner: (value) => opens.push(value), onContentHeightChange: (value) => measurements.push(value) });
    const component = childComponent(tree, banners.length ? "HeroSlide" : "HeroFallback");
    const body = component.type(component.props);
    const text = elements(body, "AppText");
    assert.ok(text.every((node) => node.props.numberOfLines === undefined));
    assert.equal(text.some((node) => node.props.children === "ХАЯТ"), false, "Brand belongs to the separate header");
    const content = elements(body, "View").find((node) => node.props.onLayout);
    content.props.onLayout({ nativeEvent: { layout: { height: 310 } } });
    assert.equal(measurements.at(-1), 310, "Fade padding must not feed back into text height");
    const cta = childComponent(body, "HeroCta");
    if (!banners.length) cta.type(cta.props).props.onPress();
    else body.props.onPress();
  }
  assert.deepEqual(opens, ["catalog", banner]);
});

test("removing a tall banner republishes the retained banner height without another layout event", () => {
  const measurements = [];
  const savedRef = { current: new Map() };
  let effects = [];
  const { HeroCarousel } = loader({ ...homeMocks(), react: { ...hooks, useRef: () => savedRef,
    useEffect: (run) => effects.push(run) } })("src/components/home/hero-carousel.tsx");
  const short = { id: "short-B", title: "Короткий баннер", link: "/catalog" };
  const tall = { id: "tall-A", title: "Очень длинный баннер с высоким текстовым блоком", link: "/catalog" };
  const props = { height: 852, scrollY: { value: 0 }, onOpenCatalog() {}, onPressBanner() {}, onContentHeightChange: (height) => measurements.push(height) };
  function slides(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(slides);
    return [...(node.type?.name === "HeroSlide" ? [node] : []), ...slides(node.props?.children)];
  }
  const first = HeroCarousel({ ...props, banners: [short, tall] });
  effects.forEach((run) => run());
  const initialSlides = slides(first);
  initialSlides[0].props.onContentHeight(100);
  initialSlides[1].props.onContentHeight(500);
  assert.equal(measurements.at(-1), 500);
  effects = [];
  const refreshed = HeroCarousel({ ...props, banners: [short] });
  assert.equal(slides(refreshed)[0].props.banner, short, "Short banner remains at the same position with the same copy");
  // No onContentHeight/onLayout call for the unchanged short slide here.
  effects.forEach((run) => run());
  assert.equal(measurements.at(-1), 100);
  assert.equal(savedRef.current.has(tall.id), false, "Removed banner measurements must be pruned");
  assert.equal(displayLayout.homeHeroHeight(667, measurements.at(-1), 88), 367);
  assert.equal(displayLayout.homeHeroHeight(667, 500, 88), 852, "Stale tall measurement would leave 485pt of extra height");
});

test("category rail expands the name's width for Dynamic Type without truncation or changed destination", () => {
  const opens = [];
  const category = { id: "qa-category", name: "Витамины и минералы", slug: "vitamins", icon: "leaf" };
  const { CategoryRail } = loader({ ...homeMocks(), "./icon-map": { sfSymbolFor: () => "leaf" } })("src/components/home/category-rail.tsx");
  const tree = CategoryRail({ categories: [category], onPress: (value) => opens.push(value), onPressAll() {} });
  const tile = childComponent(tree, "CategoryTile");
  assert.ok(tile.props.width > 158);
  assert.ok(tile.props.width <= 375 - 32, "A whole tile must fit in the viewport");
  const rendered = tile.type(tile.props);
  const name = elements(rendered, "AppText")[0];
  assert.equal(name.props.children, category.name);
  assert.equal(name.props.numberOfLines, undefined);
  rendered.props.onPress();
  assert.deepEqual(opens, [category]);
  assert.equal(tree.props.snapToInterval, tile.props.width + 12);
});

test("compact catalog keeps full count and controls and reports measured resting height to its list", () => {
  const heights = [];
  const { CatalogControlBar } = loader({
    react: hooks, "react-native": native("ios", 375, 1.9), "expo-symbols": { SymbolView: "Symbol" },
    "react-native-reanimated": { ...animation, default: animation }, "@/theme": theme,
    "@/components/ui": { AppText: "AppText", Divider: "Divider", GlassSurface: "Glass", PressableScale: "Pressable" },
    "./sort": { sortShortLabel: () => "Популярные" },
  })("src/components/catalog/control-bar.tsx");
  const opens = [];
  const tree = CatalogControlBar({ total: 2, isCounting: false, sort: "popular", activeCount: 0, scrolled: { value: 0 }, top: 64, onHeightChange: (height) => heights.push(height), onOpenSort: () => opens.push("sort"), onOpenFilters: () => opens.push("filters") });
  const count = elements(tree, "AppText")[0];
  assert.equal(count.props.children, `2${nbsp}товара`);
  assert.equal(count.props.numberOfLines, undefined);
  const row = elements(tree, "View").find((node) => node.props.onLayout);
  assert.equal(flatten(row.props.style).flexDirection, "column");
  row.props.onLayout({ nativeEvent: { layout: { height: 76 } } });
  assert.deepEqual(heights, [88]);
  const actions = elements(tree, "View").find((node) => Array.isArray(node.props.children) && node.props.children.some((child) => child?.type?.name === "BarButton"));
  for (const button of actions.props.children.filter((child) => child?.type?.name === "BarButton")) {
    const rendered = button.type(button.props);
    assert.equal(elements(rendered, "AppText")[0].props.numberOfLines, undefined);
    assert.ok(flatten(rendered.props.style).minHeight >= 44);
    rendered.props.onPress();
  }
  assert.deepEqual(opens, ["sort", "filters"]);
});
