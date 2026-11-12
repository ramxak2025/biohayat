import assert from "node:assert/strict";
import test from "node:test";
import { loader } from "./load-ts.mjs";

const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const nodes = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const tokens = loader()("src/theme/tokens.ts");
const native = {
  StyleSheet: { create: value => value, flatten, hairlineWidth: .5 },
  Text: "Text", TextInput: "TextInput", View: "View", Pressable: "Pressable",
};

test("font family selection observes loading changes and uses supplied Golos/Unbounded weights", () => {
  const loaded = new Set();
  const { appFont, appFonts } = loader({ "expo-font": { isLoaded: name => loaded.has(name) } })("src/theme/fonts.ts");
  assert.deepEqual(Object.keys(appFonts).sort(), ["Golos400", "Golos500", "Golos600", "Golos700", "Unbounded500", "Unbounded600"]);
  assert.equal(appFont(), undefined);
  loaded.add("Golos400");
  assert.equal(appFont(), "Golos400", "Font readiness must not be cached at module evaluation");
  for (const [weight, display, family] of [["500", false, "Golos500"], ["600", false, "Golos600"], ["bold", false, "Golos700"], ["500", true, "Unbounded500"], ["600", true, "Unbounded600"]]) {
    assert.equal(appFont(weight, display), undefined);
    loaded.add(family);
    assert.equal(appFont(weight, display), family);
  }
});

test("AppText keeps wrapping and caller weight while choosing text/display fonts after loading", () => {
  const { AppText } = loader({ "react-native": native, "@/theme": { ...tokens, useColors: () => tokens.lightColors } })("src/components/ui/app-text.tsx");
  const body = AppText({ children: "Полное название товара", style: { fontWeight: "600", color: "#123456" } });
  assert.equal(flatten(body.props.style).fontFamily, "Golos600");
  assert.equal(flatten(body.props.style).color, "#123456");
  assert.equal(body.props.numberOfLines, undefined);
  assert.equal(body.props.lineBreakStrategyIOS, "standard");
  assert.equal(flatten(AppText({ children: "Каталог", variant: "title2", weight: "500" }).props.style).fontFamily, "Unbounded500");
});

test("raw search input gains Golos on rerender after font loading and preserves search actions", () => {
  let ready = false;
  const actions = [];
  const { SearchField } = loader({
    react: { useEffect() {}, useRef: () => ({ current: { focus: () => actions.push("focus") } }) },
    "react-native": native, "expo-symbols": { SymbolView: "Symbol" },
    "expo-font": { isLoaded: name => ready && name === "Golos400" },
    "@/theme": { ...tokens, useColors: () => tokens.lightColors },
    "@/components/ui": { AppText: "AppText", PressableScale: "PressableScale" },
  })("src/screens/search/search-field.tsx");
  const props = { value: "магний", onChangeText: text => actions.push(text), onSubmit: () => actions.push("submit"), onFocus: () => actions.push("editing"), onCancel: () => actions.push("cancel") };
  const input = tree => nodes(tree).find(node => node.type === "TextInput");
  assert.equal(flatten(input(SearchField(props)).props.style).fontFamily, undefined);
  ready = true;
  const tree = SearchField(props);
  const field = input(tree);
  assert.equal(flatten(field.props.style).fontFamily, "Golos400");
  assert.equal(field.props.value, "магний");
  assert.equal(field.props.accessibilityLabel, "Поиск товаров");
  field.props.onSubmitEditing(); field.props.onFocus(); field.props.onChangeText("омега");
  nodes(tree).find(node => node.props.accessibilityLabel === "Очистить поле поиска").props.onPress();
  nodes(tree).find(node => node.props.accessibilityLabel === "Закрыть поиск").props.onPress();
  assert.deepEqual(actions, ["submit", "editing", "омега", "", "focus", "cancel"]);
});
