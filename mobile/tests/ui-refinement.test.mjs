import assert from "node:assert/strict";
import test from "node:test";
import { loader } from "./load-ts.mjs";

const tokens = loader()("src/theme/tokens.ts");
const flatten = (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const hooks = { useCallback: (fn) => fn, useMemo: (fn) => fn(), useEffect() {}, useRef: (value) => ({ current: value }), useState: (value) => [typeof value === "function" ? value() : value, () => {}] };
const native = (os = "ios", height = 844, fontScale = 1) => ({
  Platform: { OS: os }, StyleSheet: { create: (style) => style, flatten, hairlineWidth: 0.5, absoluteFill: {} },
  View: "View", ScrollView: "ScrollView", RefreshControl: "RefreshControl", ActivityIndicator: "Spinner",
  useWindowDimensions: () => ({ width: 390, height, fontScale }),
});
const theme = (colors = tokens.lightColors) => ({ ...tokens, useColors: () => colors, useTheme: () => ({ dark: colors === tokens.darkColors, colors }) });
const ui = Object.fromEntries(["AppText", "Button", "IconButton", "Input", "PhoneInput", "PasswordInput", "PressableScale", "EmptyState", "ErrorState", "Skeleton", "ListSkeleton", "SectionHeader", "Card", "Chip", "Divider"].map((name) => [name, name]));

test("native bars are compact by default in every state, with explicit large-title opt-in", () => {
  for (const os of ["ios", "android"]) for (const glass of [false, true]) {
    const { useStackScreenOptions, useDetailScreenOptions } = loader({
      "react-native": native(os), "@/theme": theme(), "expo-glass-effect": { isLiquidGlassAvailable: () => glass },
      "./glass-surface": { useReduceTransparency: () => false },
    })("src/components/ui/stack-options.ts");
    assert.equal(useStackScreenOptions().headerLargeTitleEnabled, false);
    assert.equal(useDetailScreenOptions().headerLargeTitleEnabled, false);
    assert.equal(useStackScreenOptions({ largeTitle: true }).headerLargeTitleEnabled, true);
    assert.equal(useStackScreenOptions({ largeTitle: true, transparent: false }).headerLargeTitleEnabled, false);
    assert.equal(useStackScreenOptions().headerTransparent, true);
    assert.equal(useStackScreenOptions().headerBackButtonDisplayMode, "minimal");
    assert.equal(useStackScreenOptions().gestureEnabled, true);
    assert.equal(useStackScreenOptions().headerBackground, undefined);
  }
});

test("Screen preserves the first native scroll descendant and insets fixed states exactly once", () => {
  const { Screen } = loader({
    react: { ...hooks, useContext: () => 93 }, "react-native": native(), "@/theme": theme(),
    "expo-router/react-navigation": { HeaderHeightContext: {} }, "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 84 }) },
  })("src/components/ui/screen.tsx");
  const scrolling = Screen({ scroll: true, footer: "Checkout", children: "Content" });
  assert.equal(scrolling.props.collapsable, false);
  assert.equal(scrolling.props.children[0].type, "ScrollView");
  assert.equal(scrolling.props.children[0].props.contentInsetAdjustmentBehavior, "automatic");
  assert.equal(flatten(scrolling.props.children[1].props.style).paddingBottom, 84);
  for (const headerTransparent of [false, true]) {
    const fixed = Screen({ headerTransparent, children: "Error" });
    assert.equal(flatten(fixed.props.children[0].props.style).paddingTop, headerTransparent ? 93 : 0);
  }
});

test("favorites grid loading/error reserve the native header, while modal states do not invent one", () => {
  for (const headerHeight of [0, 93]) {
    const { ProductGrid } = loader({
      "react-native": native(), "@shopify/flash-list": { FlashList: "FlashList" }, "expo-symbols": {}, "@/theme": theme(),
      "@/components/ui/screen": { useHeaderInset: () => headerHeight },
      "@/components/ui/empty-state": { EmptyState: "EmptyState" }, "@/components/ui/error-state": { ErrorState: "ErrorState" },
      "@/components/ui/skeleton": { ListSkeleton: "Skeleton" }, "./product-card": { ProductCard: "ProductCard" },
    })("src/components/product-card/product-grid.tsx");
    for (const state of [{ isLoading: true }, { error: new Error("offline") }]) {
      const tree = ProductGrid({ products: [], ...state });
      assert.equal(flatten(tree.props.style).paddingTop, headerHeight);
    }
    const loaded = ProductGrid({ products: [{ id: "product" }] });
    assert.equal(loaded.props.contentInsetAdjustmentBehavior, "automatic");
    assert.equal(loaded.props.contentContainerStyle.paddingTop, undefined);
  }
});

test("article loading and error states clear the transparent header without changing the loaded list", () => {
  for (const state of [{ isPending: true }, { isError: true, error: new Error("offline") }, { data: [{ id: "article" }] }]) {
    const { ArticlesScreen } = loader({
      "react-native": native(), "@shopify/flash-list": { FlashList: "FlashList" }, "expo-router": { Stack: { Screen: "StackScreen" }, useRouter: () => ({}) },
      "@tanstack/react-query": { useQuery: () => state }, "@/api/endpoints": {}, "@/api/keys": { qk: {} },
      "@/components/ui": { ...ui, useDetailScreenOptions: () => ({}) }, "@/components/ui/screen": { useHeaderInset: () => 93 },
      "@/theme": theme(), "./article-card": { ArticleCard: "ArticleCard", ArticleCardSkeleton: "Skeleton" },
    })("src/screens/articles/index.tsx");
    const tree = ArticlesScreen();
    if (state.data) assert.equal(nodes(tree).find((node) => node.type === "FlashList").props.contentInsetAdjustmentBehavior, "automatic");
    else assert.ok(nodes(tree).some((node) => node.type === "View" && flatten(node.props.style).paddingTop === 109));
  }
});

function contrast(a, b) {
  const luminance = (hex) => {
    const rgb = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("primary/secondary/ghost buttons retain AA text contrast, native targets and busy semantics in both themes", () => {
  for (const colors of [tokens.lightColors, tokens.darkColors]) for (const os of ["ios", "android"]) {
    const { Button } = loader({ "react-native": native(os), "@/theme": theme(colors), "expo-symbols": { SymbolView: "Symbol" }, "./app-text": { AppText: "AppText" }, "./press-scale": { PressableScale: "Pressable" } })("src/components/ui/button.tsx");
    for (const variant of ["primary", "secondary", "ghost"]) for (const size of ["sm", "md", "lg"]) {
      const tree = Button({ title: "Продолжить", variant, size });
      const style = flatten(tree.props.style);
      const label = nodes(tree).find((node) => node.type === "AppText");
      const foreground = flatten(label.props.style).color;
      const backgrounds = style.backgroundColor === "transparent" ? [colors.surface, colors.background] : [style.backgroundColor];
      for (const background of backgrounds) assert.ok(contrast(foreground, background) >= 4.5, `${variant}/${os} needs AA contrast`);
      assert.ok(style.minHeight >= (os === "android" ? 48 : 44));
      assert.equal(style.boxShadow, undefined);
      assert.equal(style.shadowColor, undefined);
    }
    const busy = Button({ title: "Войти", loading: true });
    assert.equal(busy.props.disabled, true);
    assert.equal(busy.props.accessibilityState.busy, true);
  }
});

test("selected filter labels and counts retain AA contrast in both themes", () => {
  for (const colors of [tokens.lightColors, tokens.darkColors]) {
    const animated = { View: "AnimatedView", useReducedMotion: () => true, useSharedValue: (value) => ({ value }), useAnimatedStyle: (fn) => fn(), interpolateColor: (value, range, values) => values[value] };
    const { Chip } = loader({
      react: hooks, "react-native": native(), "react-native-reanimated": { ...animated, default: animated },
      "expo-haptics": {}, "expo-symbols": {}, "@/theme": theme(colors),
      "./app-text": { AppText: "AppText" }, "./press-scale": { PressableScale: "Pressable" },
    })("src/components/ui/chip.tsx");
    const tree = Chip({ label: "Популярные", selected: true, count: 12 });
    const background = flatten(nodes(tree).find((node) => node.type === "AnimatedView").props.style).backgroundColor;
    for (const text of nodes(tree).filter((node) => node.type === "AppText")) {
      assert.ok(contrast(text.props.style.color, background) >= 4.5);
      assert.equal(text.props.style.opacity, undefined);
    }
  }
});

test("cards are quiet by default but preserve explicit elevation and interaction", () => {
  const pressed = [];
  const { Card } = loader({ "react-native": native(), "@/theme": theme(), "./press-scale": { PressableScale: "Pressable" } })("src/components/ui/card.tsx");
  const quiet = flatten(Card({ children: "Content" }).props.style);
  assert.equal(quiet.borderRadius, 20);
  assert.ok(quiet.borderWidth > 0);
  assert.equal(quiet.boxShadow, undefined);
  const raised = Card({ elevated: true, radius: 12, onPress: () => pressed.push(true) });
  assert.equal(flatten(raised.props.style).borderRadius, 12);
  assert.ok(flatten(raised.props.style).shadowOpacity > 0);
  raised.props.onPress();
  assert.deepEqual(pressed, [true]);
});

test("home sections render immediately while preserving content, section actions and caller index", () => {
  const { HomeSection } = loader({ "react-native": native(), "@/theme": theme(), "@/components/ui": ui })("src/components/home/home-section.tsx");
  const action = () => {};
  const tree = HomeSection({ index: 12, title: "Для вас", onAction: action, children: "Products" });
  assert.equal(tree.type, "View");
  assert.equal(tree.props.entering, undefined);
  assert.equal(nodes(tree).find((node) => node.type === "SectionHeader").props.onAction, action);
  assert.equal(tree.props.children[1], "Products");
});

test("guest account invitation stays readable and keeps its sign-in action in a calmer compact card", () => {
  const actions = [];
  const { AccountHero } = loader({
    "react-native": native(), "expo-symbols": { SymbolView: "Symbol" },
    "react-native-reanimated": { default: { View: "AnimatedView" }, useReducedMotion: () => true },
    "@/components/ui": ui, "@/lib/format": { formatPhone: (value) => value }, "@/theme": theme(),
  })("src/components/account/account-hero.tsx");
  const tree = AccountHero({ customer: null, onSignIn: () => actions.push("sign-in"), onOpenProfile() {} });
  const all = nodes(tree);
  const card = all.find((node) => node.type === "Card");
  assert.equal(card.props.tone, "surface");
  assert.equal(card.props.padded, 16);
  assert.ok(all.some((node) => node.type === "AppText" && node.props.children === "Заказы, избранное, курсы приёма и консультации — в одном месте."));
  assert.ok(all.some((node) => node.type === "View" && flatten(node.props.style).width === 48));
  all.find((node) => node.type === "Button").props.onPress();
  assert.deepEqual(actions, ["sign-in"]);
});

test("filter and time-picker shells share reachable close headers without changing apply/selection callbacks", () => {
  const common = {
    react: hooks, "react-native": { ...native(), Modal: "Modal", Pressable: "Pressable", KeyboardAvoidingView: "KeyboardAvoidingView" },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 59, bottom: 34 }) },
    "@/components/ui": ui, "@/components/ui/sheet-header": { SheetHeader: "SheetHeader" }, "@/theme": theme(),
  };
  const closed = [];
  const onCancel = () => closed.push("time");
  const onSubmit = () => {};
  const { TimePickerSheet } = loader({ ...common, "@expo/ui/swift-ui": {}, "@expo/ui/swift-ui/modifiers": {} })("src/components/tracker/time-picker-sheet.tsx");
  const time = TimePickerSheet({ visible: true, initial: "09:30", onCancel, onSubmit });
  const timeHeader = nodes(time).find((node) => node.type === "SheetHeader");
  assert.equal(timeHeader.props.onClose, onCancel);
  assert.equal(nodes(time).find((node) => node.type?.name === "PickerBody").props.onSubmit, onSubmit);
  timeHeader.props.onClose();
  const { CatalogFilterSheet } = loader({
    ...common, "@/lib/format": { plural: () => "товара" },
    "./use-catalog-products": { useCatalogCount: () => ({ data: 42 }) },
    "./use-catalog-filters": { buildCatalogQuery: () => ({}), countActiveFilters: () => 0, EMPTY_FILTERS: { sort: "popular" } },
  })("src/components/catalog/filter-sheet.tsx");
  const applied = [];
  const filters = CatalogFilterSheet({ visible: true, onClose: () => closed.push("filter"), applied: { sort: "popular" }, onApply: (value) => applied.push(value), categories: [], taxonomy: { audiences: [], goals: [] } });
  assert.equal(filters.props.presentationStyle, "pageSheet");
  assert.equal(filters.props.allowSwipeDismissal, true);
  nodes(filters).find((node) => node.type === "SheetHeader").props.onClose();
  assert.equal(applied.length, 0, "Closing must not apply the filter draft");
  assert.deepEqual(closed, ["time", "filter"]);
});

test("auth uses adaptive native sheets while search retains room for its fixed field and results", () => {
  const { sheetScreenOptions } = loader({ "react-native": native(), "@/theme": theme(), "expo-symbols": {}, "./app-text": { AppText: "AppText" }, "./press-scale": { PressableScale: "Pressable" } })("src/components/ui/sheet-header.tsx");
  for (const [height, scale, detents] of [[844, 1, [0.75, 1]], [667, 1, [0.95, 1]], [844, 1.8, [1]], [390, 1, [1]]]) {
    const options = sheetScreenOptions(height, scale, "#fff");
    assert.equal(options.presentation, "formSheet");
    assert.deepEqual(Array.from(options.sheetAllowedDetents), detents);
    assert.equal(options.sheetInitialDetentIndex, 0);
    assert.equal(options.sheetGrabberVisible, true);
    assert.equal(options.sheetExpandsWhenScrolledToEdge, true);
    assert.notEqual(options.gestureEnabled, false, "Native dismissal must remain available");
  }
  const Stack = Object.assign(() => {}, { Screen: "StackScreen" });
  const { default: RootLayout } = loader({
    react: hooks, "react-native": native(), "expo-status-bar": { StatusBar: "StatusBar" }, "expo-router": { Stack },
    "expo-splash-screen": { preventAutoHideAsync() {}, setOptions() {} }, "react-native-gesture-handler": { GestureHandlerRootView: "Root" },
    "react-native-keyboard-controller": { KeyboardProvider: "KeyboardProvider" }, "react-native-safe-area-context": { SafeAreaProvider: "SafeAreaProvider" },
    "@tanstack/react-query-persist-client": { PersistQueryClientProvider: "QueryProvider" }, "@/lib/notifications": {}, "@/components/ui/app-error-screen": {},
    "@/components/ui/sheet-header": { sheetScreenOptions }, "@/components/fx/flight": { FlyToCartProvider: "FlyProvider" },
    "@/lib/query-client": {}, "@/store/auth": { useAuth: (select) => select({ hydrate() {}, hydrating: false }) }, "@/theme": theme(),
  })("src/app/_layout.tsx");
  const routes = nodes(RootLayout()).filter((node) => node.type === "StackScreen");
  const auth = routes.find((route) => route.props.name === "auth").props.options;
  assert.equal(auth.presentation, "formSheet");
  assert.deepEqual(Array.from(auth.sheetAllowedDetents), [0.75, 1]);
  assert.equal(routes.find((route) => route.props.name === "search").props.options.presentation, "modal");
});

test("shared sheet headers wrap and expose a distinct native-size close action", () => {
  for (const os of ["ios", "android"]) {
    const actions = [];
    const { SheetHeader } = loader({ "react-native": native(os), "@/theme": theme(), "expo-symbols": { SymbolView: "Symbol" }, "./app-text": { AppText: "AppText" }, "./press-scale": { PressableScale: "Pressable" } })("src/components/ui/sheet-header.tsx");
    const tree = SheetHeader({ title: "Время вечернего приёма", closeLabel: "Закрыть выбор времени", onClose: () => actions.push("close") });
    const title = nodes(tree).find((node) => node.type === "AppText");
    assert.equal(title.props.accessibilityRole, "header");
    assert.equal(title.props.numberOfLines, undefined);
    const close = nodes(tree).find((node) => node.type === "Pressable");
    const symbol = nodes(tree).find((node) => node.type === "Symbol");
    assert.equal(symbol.props.name[os], os === "ios" ? "xmark" : "close");
    if (os === "android") {
      // Exercise the installed non-iOS renderer: string-only SF names render nothing.
      const { SymbolView } = loader({
        react: { ...hooks, useState: () => [true, () => {}], useMemo: (fn) => fn() },
        "react-native": { ...native(os), Text: "Text", PlatformColor: () => "#000" },
        "expo-font": {}, "./utils": { getFont: () => ({ name: "material", font: "test-font" }) },
        "./android": { androidSymbolToString: (name) => name },
      })("node_modules/expo-symbols/src/SymbolView.tsx");
      assert.ok(nodes(SymbolView(symbol.props)).some((node) => node.type === "Text" && node.props.children === "close"));
    }
    assert.equal(close.props.accessibilityLabel, "Закрыть выбор времени");
    assert.ok(flatten(close.props.style).minHeight >= (os === "android" ? 48 : 44));
    assert.ok(flatten(close.props.style).minWidth >= (os === "android" ? 48 : 44));
    close.props.onPress();
    assert.deepEqual(actions, ["close"]);
  }
});

test("auth sheet measures intrinsic form with centered branding, visible labels and a reachable separate close in both modes", () => {
  for (const mode of ["login", "register"]) {
    const changes = [], routes = [], measurements = [];
    const submit = () => changes.push("submit");
    const values = { name: "Алия", phone: "+79990000000", password: "password" };
    const { AuthScreen } = loader({
      react: { ...hooks, useState: (value) => [value === "login" ? mode : value, (update) => { if (typeof update === "function") measurements.push(update(72)); }] },
      "react-native": native(), "expo-router": { Stack: { Screen: "StackScreen" } }, "./use-auth-dismiss": { useAuthDismiss: () => () => routes.push("back") },
      "expo-image": { Image: "Image" }, "expo-haptics": { selectionAsync() {} },
      "react-native-keyboard-controller": { KeyboardAwareScrollView: "KeyboardScrollView", KeyboardController: { setFocusTo() {} } },
      "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 59, bottom: 34 }) },
      "react-native-reanimated": { default: { View: "AnimatedView" }, useReducedMotion: () => true },
      "@/components/account": {}, "@/components/ui": ui,
      "@/components/ui/sheet-header": { sheetScreenOptions: () => ({ presentation: "formSheet" }) }, "@/hooks/use-settings": { useSettings: () => ({}) },
      "@/lib/format": { isValidPhone: () => false }, "@/theme": theme(),
      "./form-message": { FormMessage: "FormMessage" }, "./legal-note": { LegalNote: "LegalNote" },
      "./use-auth-form": { useAuthForm: (receivedMode) => { assert.equal(receivedMode, mode); return { values, fieldErrors: {}, pending: false, clearErrors() {}, submit, patch: (patch) => changes.push(patch) }; } },
      "../../../assets/brand/logo-mark.png": 1,
    })("src/screens/auth/index.tsx");
    const tree = AuthScreen();
    assert.equal(tree.props.collapsable, false);
    const scroll = nodes(tree).find((node) => node.type === "KeyboardScrollView");
    assert.equal(scroll.type, "KeyboardScrollView", "Native sheet must find scrolling content before the fixed header");
    assert.equal(scroll.props.keyboardShouldPersistTaps, "handled");
    assert.equal(scroll.props.keyboardDismissMode, "interactive");
    assert.ok(scroll.props.bottomOffset > 0);
    assert.equal(flatten(scroll.props.contentContainerStyle).flexGrow, undefined, "No empty flex spacer may push actions to the sheet edge");
    const all = nodes(tree);
    const fields = all.filter((node) => ["Input", "PhoneInput", "PasswordInput"].includes(node.type));
    assert.deepEqual(fields.map((node) => node.props.label), mode === "register" ? ["Имя", "Телефон", "Пароль"] : ["Телефон", "Пароль"]);
    assert.equal(fields.find((node) => node.type === "PasswordInput").props.value, values.password);
    const primary = all.find((node) => node.type === "Button");
    assert.equal(primary.props.onPress, submit);
    assert.equal(primary.props.title, mode === "register" ? "Создать аккаунт" : "Войти");
    const intrinsic = all.find((node) => node.type === "View" && node.props.onLayout);
    assert.ok(nodes(scroll).includes(intrinsic), "Measure the inner content, not the changing sheet viewport");
    assert.equal(flatten(intrinsic.props.style).flexGrow, undefined);
    assert.equal(flatten(intrinsic.props.style).paddingBottom, 54);
    intrinsic.props.onLayout({ nativeEvent: { layout: { height: 592 } } });
    assert.deepEqual(measurements, [592]);
    const close = all.find((node) => node.type === "IconButton");
    assert.equal(close.props.name.ios, "xmark");
    assert.equal(close.props.name.android, "close");
    assert.equal(close.props.name.web, "close");
    assert.ok(flatten(close.props.style).minHeight >= 44);
    close.props.onPress();
    assert.deepEqual(routes, ["back"]);
    const brand = all.find((node) => node.type === "Image");
    assert.equal(brand.props.contentFit, "contain");
    assert.equal(brand.props.source, 1);
    assert.equal(flatten(brand.props.style).height, 48);
    assert.equal(all.filter((node) => node.type === "View").some((node) => flatten(node.props.style).flex === 1), true, "Root still fills the native sheet");
    assert.equal(mode === "register", all.some((node) => node.type === "LegalNote"));
  }
});
