import assert from "node:assert/strict";
import test from "node:test";
import { loader } from "./load-ts.mjs";

const tokens = loader()("src/theme/tokens.ts");
const flat = (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const nodes = (value) => !value || typeof value !== "object" ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const hooks = { useCallback: (fn) => fn, useMemo: (fn) => fn(), useEffect() {}, useState: (value) => [value, () => {}] };
const native = { Platform: { OS: "ios" }, StyleSheet: { create: (value) => value, absoluteFill: {}, hairlineWidth: .5 }, View: "View" };
const theme = (colors = tokens.darkColors) => ({ ...tokens, useColors: () => colors });
const ui = Object.fromEntries(["AppText", "Screen", "ErrorState", "Card", "ListSkeleton", "BadDisclaimer"].map((name) => [name, name]));

function contrast(a, b) {
  const luminance = (hex) => hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

test("dark semantic text, placeholders and status badges remain readable across all elevated surfaces", () => {
  const colors = tokens.darkColors;
  const surfaces = [colors.background, colors.surface, colors.surfaceSoft, colors.surfaceSunken];
  for (const surface of surfaces) for (const color of [colors.text, colors.textMuted, colors.textFaint, colors.brandText, colors.danger, colors.warning, colors.success, colors.info]) {
    assert.ok(contrast(color, surface) >= 4.5, `${color} on ${surface}`);
  }
  assert.ok(new Set(surfaces).size === 4, "Grouped/elevated content must remain distinguishable");
  const { Badge } = loader({ "react-native": native, "expo-symbols": {}, "@/theme": theme(), "./app-text": { AppText: "AppText" } })("src/components/ui/badge.tsx");
  for (const tone of ["brand", "sale", "accent", "neutral", "success", "danger"]) for (const solid of [false, true]) {
    const badge = Badge({ label: "Подтверждён", tone, solid });
    const label = nodes(badge).find((node) => node.type === "AppText");
    assert.ok(contrast(flat(label.props.style).color, flat(badge.props.style).backgroundColor) >= 4.5, `${tone}/${solid}`);
  }
});

test("Reduce Transparency uses a solid themed surface, and older iOS keeps the matching native blur material", () => {
  for (const [dark, colors] of [[true, tokens.darkColors], [false, tokens.lightColors]]) for (const reduced of [false, true]) {
    const { GlassSurface } = loader({
      react: { ...hooks, useState: () => [reduced, () => {}] }, "react-native": native, "expo-blur": { BlurView: "Blur" },
      "expo-glass-effect": { GlassView: "Glass", isGlassEffectAPIAvailable: () => false, isLiquidGlassAvailable: () => false },
      "@/theme": { ...theme(colors), useTheme: () => ({ dark }) },
    })("src/components/ui/glass-surface.tsx");
    const surface = GlassSurface({ children: "Actions" });
    if (reduced) {
      assert.equal(surface.type, "View");
      assert.equal(flat(surface.props.style).backgroundColor, colors.surface);
      assert.match(flat(surface.props.style).backgroundColor, /^#[0-9a-f]{6}$/i);
    } else assert.equal(surface.props.tint, dark ? "systemThickMaterialDark" : "systemThickMaterialLight");
  }
});

test("native tabs never minimize, while only the iOS home stack owns edge-to-edge scroll insets", () => {
  for (const os of ["ios", "android"]) {
    const Trigger = Object.assign(() => null, { Label: "Label", Icon: "Icon", Badge: "Badge" });
    const NativeTabs = Object.assign(() => null, { Trigger });
    const { default: Tabs } = loader({ "react-native": { Platform: { OS: os } }, "expo-router/unstable-native-tabs": { NativeTabs }, "@/store/cart": { useCartCount: () => 2 }, "@/theme": theme() })("src/app/(tabs)/_layout.tsx");
    const tree = Tabs();
    assert.equal(tree.props.minimizeBehavior, "never");
    const triggers = nodes(tree).filter((node) => node.type === Trigger);
    assert.equal(triggers.length, 5);
    assert.equal(triggers.find((node) => node.props.name === "(home)").props.disableAutomaticContentInsets, os === "ios");
    assert.equal(triggers.find((node) => node.props.name === "catalog").props.disableAutomaticContentInsets, undefined);
    assert.ok(nodes(tree).some((node) => node.type === "Badge" && node.props.children === "2"));
  }
});

test("home offset normalization uses the actual native resting inset", () => {
  const { homeScrollOffset } = loader()("src/lib/display-layout.ts");
  for (const inset of [0, 20, 59]) {
    assert.equal(homeScrollOffset(-inset, inset), 0);
    assert.equal(homeScrollOffset(600 - inset, inset), 600);
    assert.equal(homeScrollOffset(-inset - 25, inset), -25, "Pull-to-refresh/parallax must retain negative overscroll");
  }
});

test("scrolled home chrome retains an opaque themed backing and correct status style after inset/theme changes", () => {
  let colors = tokens.darkColors, top = 59, focused = true, onGlass = false;
  const scrollY = { value: 0 };
  const interpolate = (value, [start, end], [from, to]) => from + (to - from) * Math.max(0, Math.min(1, (value - start) / (end - start)));
  const animation = { View: "AnimatedView", Extrapolation: { CLAMP: "clamp" }, interpolate, interpolateColor: () => colors.background,
    useReducedMotion: () => false, useAnimatedStyle: (fn) => fn(), useAnimatedReaction: (prepare, react) => react(prepare(), null), runOnJS: (fn) => fn };
  const { HomeChroma } = loader({
    react: { ...hooks, useState: () => [onGlass, (next) => { onGlass = next; }] }, "react-native": native,
    "expo-router": { useIsFocused: () => focused, useRouter: () => ({ push() {} }) }, "expo-linear-gradient": { LinearGradient: "Gradient" },
    "expo-status-bar": { StatusBar: "StatusBar" }, "expo-image": { Image: "Image" }, "expo-symbols": {},
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top }) }, "react-native-reanimated": { ...animation, default: animation },
    "@/components/ui": { AppText: "AppText", GlassSurface: "Glass", PressableScale: "Pressable", useReduceTransparency: () => false },
    "@/hooks/use-favorites": { useFavorites: () => ({ ids: new Set() }) }, "@/theme": { ...tokens, useColors: () => colors, useTheme: () => ({ dark: colors === tokens.darkColors }) },
    "../../../assets/brand/logo-mark.png": 1, "../../../assets/brand/logo-mark-white.png": 2,
  })("src/components/home/home-chroma.tsx");
  const render = () => HomeChroma({ scrollY, heroHeight: 600, barHeight: 52, onBarHeightChange() {} });
  const backing = (tree) => nodes(tree).find((node) => node.type === "AnimatedView" && flat(node.props.style).backgroundColor === colors.surface);
  assert.equal(flat(backing(render()).props.style).opacity, 0);
  scrollY.value = 650;
  render();
  for (const next of [tokens.darkColors, tokens.lightColors]) {
    colors = next; top = 20;
    const tree = render();
    assert.equal(flat(backing(tree).props.style).opacity, 1);
    assert.equal(nodes(tree).find((node) => node.type === "StatusBar").props.style, next === tokens.darkColors ? "light" : "dark");
  }
  focused = false;
  assert.equal(nodes(render()).some((node) => node.type === "StatusBar"), false);
});

const settings = { phone: "+79991234567", email: "shop@example.test", address: "Адрес магазина", workingHours: "10:00–18:00", socials: { whatsapp: "https://wa.me/79991234567", telegram: "https://t.me/shop", instagram: "https://instagram.com/shop", vk: "https://vk.com/shop", wildberries: "https://wildberries.ru/seller/shop" }, legal: { name: "Компания ХАЯТ", inn: "12345", ogrn: "67890", address: "Юридический адрес" } };

test("contacts retain actual settings URLs and use distinct original social marks", () => {
  const opened = [];
  const { ContactsCard } = loader({
    "@/components/ui": ui, "@/theme": theme(), "./menu-group": { MenuGroup: "Group" }, "./menu-row": { MenuRow: "Row" }, "./social-icon": { SocialIcon: "SocialIcon" },
    "./links": { telHref: (phone) => `tel:${phone}`, mailHref: (email) => `mailto:${email}`, openExternalUrl: (url) => opened.push(url) },
  })("src/components/account/contacts-card.tsx");
  const tree = ContactsCard({ settings });
  const rows = nodes(tree).filter((node) => node.type === "Row");
  assert.match(tree.props.footer, /Meta Platforms Inc.*экстремистской.*запрещена/);
  for (const row of rows) row.props.onPress();
  assert.deepEqual(opened, [`tel:${settings.phone}`, ...Object.values(settings.socials), `mailto:${settings.email}`]);
  assert.equal(rows.find((row) => row.props.title === "Написать на почту").props.subtitle, settings.email);
  const { SocialIcon } = loader({ "react-native-svg": { __esModule: true, default: "Svg", Path: "Path" }, "expo-symbols": {} })("src/components/account/social-icon.tsx");
  const paths = ["telegram", "instagram", "whatsapp", "vk"].map((brand) => {
    const icon = SocialIcon({ brand, color: tokens.darkColors.brandText });
    assert.equal(icon.type, "Svg");
    return nodes(icon).find((node) => node.type === "Path").props.d;
  });
  assert.equal(new Set(paths).size, 4);
});

test("contacts/documents are public native-stack routes with error recovery and canonical document actions", () => {
  const retry = [], opened = [];
  const state = { data: settings, refetch: () => retry.push(true) };
  const shared = { "expo-router": { Stack: { Screen: "StackScreen" } }, "@/components/ui": { ...ui, useDetailScreenOptions: () => ({ headerLargeTitleEnabled: false }) }, "@/hooks/use-settings": { useSettings: () => state } };
  const { ContactsScreen } = loader({ ...shared, "@/components/account/contacts-card": { ContactsCard: "ContactsCard" } })("src/screens/account/contacts.tsx");
  assert.ok(nodes(ContactsScreen()).some((node) => node.type === "ContactsCard" && node.props.settings === settings));
  state.data = undefined; state.isError = true; state.error = new Error("offline");
  const failed = ContactsScreen();
  assert.equal(nodes(failed).some((node) => node.type === "ContactsCard"), false);
  nodes(failed).find((node) => node.type === "ErrorState").props.onRetry();
  assert.equal(retry.length, 1);
  state.data = settings; state.isError = false;
  const { LEGAL_URL } = loader({ react: hooks, "react-native": {}, "expo-web-browser": {}, "@/theme": theme() })("src/components/account/links.ts");
  const { DocumentsScreen } = loader({ ...shared, "@/components/account/links": { LEGAL_URL, useOpenBrowser: () => (url) => opened.push(url) }, "@/components/account/menu-group": { MenuGroup: "Group" }, "@/components/account/menu-row": { MenuRow: "Row" } })("src/screens/account/documents.tsx");
  const documents = DocumentsScreen();
  for (const row of nodes(documents).filter((node) => node.type === "Row")) row.props.onPress();
  assert.deepEqual(opened, [LEGAL_URL.offer, LEGAL_URL.privacy, LEGAL_URL.consent, LEGAL_URL.delivery]);
  assert.ok(nodes(documents).find((node) => node.type === "Group").props.footer.includes(settings.legal.inn));
  const layout = loader({ "expo-router": { Stack: "Stack" }, "@/components/ui/stack-options": {} })("src/app/(tabs)/account/_layout.tsx");
  assert.equal(layout.unstable_settings.initialRouteName, "index");
  for (const route of ["contacts", "documents"]) {
    const result = loader({ [`@/screens/account/${route}`]: { [route === "contacts" ? "ContactsScreen" : "DocumentsScreen"]: "PublicScreen" } })(`src/app/(tabs)/account/${route}.tsx`);
    assert.equal(result.default().type, "PublicScreen");
  }
});

test("account information entries open the same public destinations for guests and signed-in customers", () => {
  for (const token of [null, "test-token"]) {
    const pushed = [];
    const { AccountScreen } = loader({
      react: hooks, "react-native": native, "expo-application": {}, "expo-haptics": {}, "expo-router": { Stack: { Screen: "StackScreen" }, useRouter: () => ({ push: (...args) => pushed.push(args) }) },
      "@tanstack/react-query": { useQueryClient: () => ({}) }, "@/api/endpoints": {}, "@/api/keys": {}, "@/components/account": { AccountHero: "Hero", BonusCard: "Bonus", MenuGroup: "Group", MenuRow: "Row", useOrders: () => ({}) },
      "@/components/ui": ui, "@/hooks/use-favorites": { useFavorites: () => ({ ids: new Set() }) }, "@/hooks/use-settings": { useSettings: () => ({}) },
      "@/store/auth": { useAuth: (select) => select({ token, customer: null }) }, "@/lib/session-generation": {}, "@/theme": tokens,
    })("src/screens/account/index.tsx");
    const tree = AccountScreen();
    const rows = nodes(tree).filter((node) => node.type === "Row");
    for (const title of ["Контакты", "Документы"]) rows.find((row) => row.props.title === title).props.onPress();
    assert.deepEqual(pushed.map(([path]) => path), ["./contacts", "./documents"]);
    for (const [, options] of pushed) assert.equal(options.relativeToDirectory, true);
    assert.equal(rows.some((row) => row.props.title === "Публичная оферта"), false, "Documents must not remain inline");
  }
});
