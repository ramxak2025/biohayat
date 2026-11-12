import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { createElement } from "react";
import { loader } from "./load-ts.mjs";

const tokens = loader()("src/theme/tokens.ts");
const theme = { ...tokens, useColors: () => tokens.lightColors, useTheme: () => ({ dark: false, colors: tokens.lightColors }) };
const flat = (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
function nodes(value) { return !value || typeof value !== "object" ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)]; }
const hooks = { memo: (fn) => fn, useRef: (value) => ({ current: value }), useCallback: (fn) => fn, useState: (value) => [value, () => {}] };
const native = { Platform: { OS: "ios" }, StyleSheet: { create: (value) => value, absoluteFill: {}, hairlineWidth: .5 }, View: "View", Pressable: "Pressable", ScrollView: "ScrollView", useWindowDimensions: () => ({ width: 390, height: 844 }) };
const animation = { View: "AnimatedView", ScrollView: "AnimatedScrollView", useReducedMotion: () => true, useAnimatedRef: () => ({ current: null }), useSharedValue: (value) => ({ value }), useAnimatedStyle: (fn) => fn(), useAnimatedScrollHandler: (fn) => fn, useAnimatedReaction() {} };
const product = { id: "test-product", slug: "масло & витамин", name: "Комплекс витаминов и минералов для ежедневного рациона", price: { kopecks: 123400, formatted: "1 234 ₽" }, images: [{ url: "https://example.test/product.png" }], image: "https://example.test/product.png", category: { name: "Витамины", slug: "vitamins" }, inStock: true, badges: [], description: "Описание", composition: "Состав", usage: "Применение", contraindications: "Ограничения", shortDescription: "Короткое описание" };
const ui = Object.fromEntries(["AppText", "BadDisclaimer", "Badge", "ErrorState", "IconButton", "PressableScale", "Screen", "SectionHeader", "Skeleton", "Price", "Stepper"].map((name) => [name, name]));
const productParts = Object.fromEntries(["AccordionSection", "ImageViewer", "ProductAssurance", "ProductBuyBar", "ProductGallery", "ProductPriceBlock", "ProductScreenSkeleton", "ProductSpecs", "ProductTrackerCard"].map((name) => [name, name]));

test("product navigation uses one public Link source with reduced-motion and Android fallbacks", () => {
  const Link = Object.assign(() => null, { AppleZoom: "AppleZoom", AppleZoomTarget: "AppleZoomTarget" });
  const child = createElement("Touchable");
  for (const [os, reduced, zoom] of [["ios", false, true], ["ios", true, false], ["android", false, false]]) {
    const { ProductLink, ProductZoomSource, ProductZoomTarget } = loader({
      "react-native": { Platform: { OS: os } }, "expo-router": { Link }, "react-native-reanimated": { useReducedMotion: () => reduced },
    })("src/components/product-card/product-link.tsx");
    const link = ProductLink({ href: { pathname: "/catalog/product/[slug]", params: { slug: product.slug } }, children: child });
    assert.equal(link.props.asChild, true);
    assert.equal(link.props.push, true);
    assert.equal(link.props.onPress, undefined, "No second imperative navigation handler");
    assert.equal(link.props.children, child);
    assert.equal(ProductZoomSource({ children: child }).type, zoom ? "AppleZoom" : "Touchable");
    assert.equal(ProductZoomTarget({ children: child }).type, zoom ? "AppleZoomTarget" : "Touchable");
    assert.equal(ProductZoomSource({ children: child, enabled: false }), child);
  }
});

test("zoom and link sources satisfy the installed Expo Slot style contract without losing their frame", () => {
  const Link = Object.assign(() => null, { AppleZoom: "AppleZoom" });
  const { ProductLink, ProductZoomSource } = loader({
    "react-native": { Platform: { OS: "ios" }, StyleSheet: { flatten: flat } },
    "expo-router": { Link }, "react-native-reanimated": { useReducedMotion: () => false },
  })("src/components/product-card/product-link.tsx");
  const { Slot } = loader({
    react: { ...React, useMemo: (fn) => fn() },
    "react-native": { StyleSheet: { flatten: flat } },
    "@radix-ui/react-slot": { Slot: "RadixSlot" },
  })("node_modules/expo-router/build/ui/Slot.js");
  const ref = { current: null };
  const photo = createElement("View", { ref, collapsable: false, style: [{ width: 170, height: 170 }, { borderRadius: 20 }] }, "Photo");
  assert.throws(() => Slot.render({ children: photo }, null), /array of styles/);
  for (const tree of [ProductZoomSource({ children: photo }), ProductLink({ href: "/catalog", children: photo })]) {
    const child = tree.props.children;
    assert.doesNotThrow(() => Slot.render({ children: child }, null));
    assert.deepEqual(child.props.style, { width: 170, height: 170, borderRadius: 20 });
    assert.equal(child.props.ref, ref);
    assert.equal(child.props.collapsable, false);
    assert.equal(child.props.children, "Photo");
  }
});

test("grid and row cards preserve tab hrefs and keep favorite/cart actions outside navigation", () => {
  for (const layout of ["grid", "row"]) for (const tab of ["(home)", "catalog", "account", "cart"]) {
    const { ProductCard } = loader({
      "react-native": native, "expo-image": { Image: "Image" }, "expo-router": { useRouter: () => ({ push() { throw new Error("Unexpected imperative navigation"); } }), useSegments: () => ["(tabs)", tab, "favorites"] },
      "react-native-reanimated": { ...animation, default: animation }, "expo-symbols": {}, "@/theme": theme,
      "@/components/ui/app-text": { AppText: "AppText" }, "@/components/ui/badge": { Badge: "Badge" }, "@/components/ui/press-scale": { PressableScale: "Pressable" }, "@/components/ui/price": { Price: "Price" },
      "./add-to-cart": { AddToCart: "AddToCart" }, "./favorite-button": { FavoriteButton: "FavoriteButton" }, "./product-link": { ProductLink: "ProductLink", ProductZoomSource: "Source" },
    })("src/components/product-card/product-card.tsx");
    const tree = ProductCard({ product, layout });
    const link = nodes(tree).find((node) => node.type === "ProductLink");
    assert.equal(link.props.href.pathname, `/(tabs)/${tab}/product/[slug]`);
    assert.equal(link.props.href.params.slug, product.slug);
    assert.equal(nodes(link).filter((node) => node.type === "Source").length, 1);
    assert.equal(nodes(link).some((node) => ["AddToCart", "FavoriteButton"].includes(node.type)), false);
    assert.equal(link.props.children.props.onPress, undefined);
    assert.equal(nodes(link).find((node) => node.type === "Image").props.contentFit, "contain");
    const chosen = [];
    const custom = ProductCard({ product, layout, onPress: (item) => chosen.push(item) });
    assert.equal(nodes(custom).some((node) => node.type === "ProductLink"), false);
    assert.equal(nodes(custom).find((node) => node.type === "Source").props.enabled, false);
    nodes(custom).find((node) => node.type === "Pressable").props.onPress();
    assert.deepEqual(chosen, [product]);
  }
});

test("product identity precedes contained media and price, with opaque navigation and an always-visible measured dock", () => {
  for (const images of [product.images, []]) {
    let footerHeight = 0;
    const load = loader({
      react: { ...hooks, useState: (value) => [typeof value === "number" ? footerHeight : value, (update) => { footerHeight = update(footerHeight); }] },
      "react-native": native, "expo-router": { Stack: { Screen: "StackScreen" }, useRouter: () => ({ push() {} }) }, "expo-symbols": {},
      "@tanstack/react-query": { useQuery: ({ queryKey }) => ({ data: queryKey[0] === "product" ? { ...product, images } : [], refetch() {} }) },
      "react-native-reanimated": { ...animation, default: animation }, "@/api/endpoints": {}, "@/api/keys": { qk: { product: () => ["product"], related: () => ["related"] } },
      "@/components/product": { ...productParts, hasProductSpecs: () => true }, "@/components/fx/flight": { FlyToCartProvider: "Fly" }, "@/components/product-card": { FavoriteButton: "Favorite", ProductStrip: "ProductStrip" },
      "@/components/ui": { ...ui, useTabBarInset: () => 84, useStackScreenOptions: (options) => { assert.equal(options.transparent, false); return { headerTransparent: false }; } },
      "@/components/product-card/product-link": { ProductZoomTarget: "Target" }, "@/theme": theme, "./share-product": { shareProduct() {} },
    });
    const { ProductScreen } = load("src/screens/product/index.tsx");
    const tree = ProductScreen({ slug: product.slug });
    const all = nodes(tree);
    const scroll = all.find((node) => node.type === "AnimatedScrollView");
    assert.equal(scroll.props.contentInsetAdjustmentBehavior, "automatic");
    assert.equal(scroll.props.onScroll, undefined, "Purchase availability must not depend on a scroll threshold");
    const name = all.findIndex((node) => node.type === "AppText" && node.props.children === product.name);
    const gallery = all.findIndex((node) => node.type === "ProductGallery");
    const price = all.findIndex((node) => node.type === "ProductPriceBlock");
    assert.ok(name < gallery && gallery < price);
    assert.equal(all[name].props.numberOfLines, undefined);
    assert.equal(all[gallery].props.height, 296);
    assert.equal(all[gallery].props.width, 358);
    assert.equal(all[gallery].props.scrollY, undefined);
    assert.equal(all.find((node) => node.type === "StackScreen").props.options.headerTransparent, false);
    assert.equal(all.find((node) => node.type === "StackScreen").props.options.title, "Товар");
    assert.ok(all.some((node) => node.type === "ProductBuyBar"));
    const dock = all.find((node) => node.props.onLayout);
    assert.equal(flat(dock.props.style).bottom, 92);
    assert.equal(flat(dock.props.style).opacity, undefined);
    dock.props.onLayout({ nativeEvent: { layout: { height: 121 } } });
    const rerendered = nodes(ProductScreen({ slug: product.slug })).find((node) => node.type === "AnimatedScrollView");
    assert.equal(rerendered.props.contentContainerStyle.paddingBottom, 145, "Only footer +8pt gap +16pt end spacing; UIKit supplies tab inset once");
    for (const type of ["ProductSpecs", "ProductTrackerCard", "BadDisclaimer", "AccordionSection"]) assert.ok(all.some((node) => node.type === type));
  }
});

test("cold loading reserves the same media target frame and identity space", () => {
  const { ProductScreenSkeleton } = loader({ "react-native": native, "@/theme": theme, "@/components/ui": ui, "@/components/product-card/product-link": { ProductZoomTarget: "Target" } })("src/components/product/product-screen-skeleton.tsx");
  const tree = ProductScreenSkeleton({ heroHeight: 296 });
  assert.equal(tree.props.contentInsetAdjustmentBehavior, "automatic");
  const target = nodes(tree).find((node) => node.type === "Target");
  assert.equal(target.props.children.props.collapsable, false);
  assert.equal(nodes(target).find((node) => node.type === "Skeleton").props.height, 296);
  assert.equal(flat(tree.props.children[0].props.style).minHeight, 112);
});

test("gallery shows packshots in full, avoids vertical transformations and exposes load failure", () => {
  let failed = false;
  const { ProductGallery } = loader({
    react: { ...hooks, useState: (value) => [typeof value === "boolean" ? failed : value, (next) => { failed = next; }] }, "react-native": native,
    "react-native-reanimated": { ...animation, default: animation }, "react-native-worklets": {}, "expo-image": { Image: "Image" }, "expo-symbols": { SymbolView: "Symbol" },
    "@/components/ui": ui, "@/theme": theme, "../../../assets/brand/logo-mark.png": 1,
  })("src/components/product/product-gallery.tsx");
  const tree = ProductGallery({ images: product.images, name: product.name, width: 358, height: 296, reducedMotion: true });
  assert.equal(flat(tree.props.children[0].props.style).transform, undefined);
  const slide = nodes(tree).find((node) => node.type?.name === "Slide");
  const image = nodes(slide.type(slide.props)).find((node) => node.type === "Image");
  assert.equal(image.props.contentFit, "contain");
  image.props.onError();
  assert.ok(nodes(slide.type(slide.props)).some((node) => node.type === "AppText" && node.props.children === "Не удалось загрузить фото"));
});

test("cart line navigation excludes quantity and deletion controls", () => {
  const changes = [], removed = [];
  const line = { ...product, qty: 2, priceKopecks: 123400 };
  const { CartLineRow } = loader({
    react: hooks, "react-native": native, "expo-image": { Image: "Image" }, "expo-router": { useSegments: () => ["(tabs)", "cart"] }, "expo-symbols": {},
    "react-native-reanimated": { ...animation, default: animation }, "react-native-gesture-handler/ReanimatedSwipeable": { default: "Swipeable" },
    "@/components/ui": ui, "@/store/cart": { useCart: (select) => select({ setQty: (...args) => changes.push(args) }) }, "@/theme": theme,
    "@/components/product-card/product-link": { ProductLink: "ProductLink", ProductZoomSource: "Source" },
  })("src/components/cart/cart-line-row.tsx");
  const tree = CartLineRow({ line, index: 0, onRemove: (value) => removed.push(value.id) });
  const link = nodes(tree).find((node) => node.type === "ProductLink");
  assert.equal(link.props.href.pathname, "/(tabs)/cart/product/[slug]");
  assert.equal(link.props.href.params.slug, product.slug);
  assert.equal(nodes(link).some((node) => ["Stepper", "IconButton"].includes(node.type)), false);
  assert.equal(nodes(link).filter((node) => node.type === "Source").length, 1);
  nodes(tree).find((node) => node.type === "Stepper").props.onChange(3);
  nodes(tree).find((node) => node.type === "IconButton").props.onPress();
  assert.deepEqual(changes, [[product.id, 3]]);
  assert.deepEqual(removed, [product.id]);
});

test("favorite and add-to-cart taps stop propagation and preserve their own actions", () => {
  const actions = [];
  const common = { react: { ...hooks, useEffect() {} }, "react-native": native, "expo-symbols": {}, "@/theme": theme,
    "react-native-reanimated": { ...animation, useAnimatedStyle: () => ({}), default: animation },
    "@/components/ui/press-scale": { PressableScale: "Pressable" }, "@/components/ui/app-text": { AppText: "AppText" },
  };
  const { FavoriteButton } = loader({ ...common, "@/components/fx/heart": { HeartBurst: "Burst" }, "@/hooks/use-favorites": { useFavorites: () => ({ isFavorite: () => false, toggle: (id) => actions.push(id) }) } })("src/components/product-card/favorite-button.tsx");
  FavoriteButton({ productId: product.id }).props.onPress({ stopPropagation: () => actions.push("stop") });
  assert.deepEqual(actions, ["stop", product.id]);
  const { AddToCart } = loader({ ...common,
    "@/components/ui/stepper": { Stepper: "Stepper" }, "expo-haptics": { notificationAsync() {}, NotificationFeedbackType: { Success: "success" } },
    "@/components/fx/flight": { useFlyToCart: () => ({ onLand }) => onLand() }, "@/store/cart": { useCart: (select) => select({ lines: [], add: (item) => actions.push(item.id) }) },
  })("src/components/product-card/add-to-cart.tsx");
  const add = nodes(AddToCart({ product })).find((node) => node.type === "Pressable");
  add.props.onPress({ stopPropagation: () => actions.push("stop") });
  assert.deepEqual(actions, ["stop", product.id, "stop", product.id]);
});
