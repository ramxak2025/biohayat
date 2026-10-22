import assert from "node:assert/strict";
import test from "node:test";
import { loader, loadCallback } from "./load-ts.mjs";

const { normalizePhoneInput, phoneInputDisplay, PHONE_MASK } = loader()("src/lib/phone-input.ts");
const { normalizePhone, isValidPhone } = loader()("src/lib/format.ts");
const { authSheetFraction, authSheetContentBottomInset } = loader()("src/lib/auth-sheet-layout.ts");

test("Russian typing, ten-digit paste and domestic/international formatting converge on one account number", () => {
  for (const raw of ["9991234567", "89991234567", "+7 (999) 123-45-67", "7 999 123 45 67"]) {
    const model = normalizePhoneInput(raw);
    assert.equal(model, "+79991234567");
    assert.equal(isValidPhone(model), true);
    assert.equal(phoneInputDisplay(model), "+7 999 123-45-67");
  }
  let model = "";
  for (const digit of "9991234567") model = normalizePhoneInput(phoneInputDisplay(model) + digit);
  assert.equal(model, "+79991234567");
  assert.equal(normalizePhone("8 (999) 123-45-67"), model);
});

test("empty, country-only, delete and partial input retain model/display separation and never contain mask digits", () => {
  for (const raw of ["", "+7", "7", "8"]) {
    const model = normalizePhoneInput(raw);
    assert.equal(phoneInputDisplay(model), "");
    assert.equal(isValidPhone(model), false);
    assert.equal(model.includes("_"), false);
  }
  assert.equal(normalizePhoneInput("9"), "+79");
  assert.equal(isValidPhone(normalizePhoneInput("999")), false);
  assert.equal(normalizePhoneInput("+7 999 123-45-6"), "+7999123456");
  assert.equal(normalizePhoneInput(""), "");
  assert.equal(PHONE_MASK, "+7 ___ ___-__-__");
});

test("explicit foreign country codes and excess digits are preserved and rejected instead of changing accounts", () => {
  for (const raw of ["+86 123456789", "+1 999 123 4567", "+7 999123456789", "0044 2071234567", "999123456789999"]) {
    const model = normalizePhoneInput(raw);
    assert.equal(isValidPhone(model), false, raw);
    assert.equal(phoneInputDisplay(model), model, "Invalid input must not be prettified into another Russian account");
  }
  assert.equal(normalizePhone("+86123456789"), "+86123456789");
  assert.equal(normalizePhone("+7999123456789"), "+7999123456789");
});

test("PhoneInput shows an immediate mask and lets invalid pasted values reach validation in all shared forms", () => {
  const values = [];
  const { PhoneInput } = loader({
    react: { useEffect() {}, useState: (value) => [value, () => {}] },
    "react-native": { StyleSheet: { create: (value) => value }, View: "View", TextInput: "TextInput" },
    "react-native-reanimated": { default: { View: "AnimatedView" } }, "expo-symbols": {},
    "@/theme": { spacing: { xs: 4, sm: 8, md: 12, base: 16 }, radii: {}, typography: { body: { fontSize: 17, lineHeight: 22 } } },
    "./app-text": {}, "./icon-button": {},
  })("src/components/ui/input.tsx");
  for (const value of ["", "+7"]) {
    const tree = PhoneInput({ value, onChangeText: (next) => values.push(next) });
    assert.equal(tree.props.value, "");
    assert.equal(tree.props.placeholder, PHONE_MASK);
    assert.ok(tree.props.maxLength >= 64, "Native maxLength must not silently shorten an invalid number to a valid one");
    tree.props.onChangeText("9991234567");
    tree.props.onChangeText("+7999123456789");
  }
  assert.deepEqual(values, ["+79991234567", "+7999123456789", "+79991234567", "+7999123456789"]);
});

test("native auth detents follow intrinsic content growth/shrink and cap overflow independently of keyboard viewport", () => {
  const available = 844 - 59;
  const login = authSheetFraction(570, 844, 59);
  const register = authSheetFraction(720, 844, 59);
  assert.ok(login < register && register <= 1);
  assert.ok(login * available >= 570 + 12);
  assert.ok(login * available - (570 + 12) < available * 0.01 + 1);
  assert.equal(authSheetFraction(570, 844, 59), login, "The same intrinsic layout must settle, not grow with the viewport");
  assert.equal(authSheetFraction(1200, 667, 20), 1);
  assert.equal(authSheetFraction(570, 844, 59, 1.8), login, "Already measured text must not be scaled twice");
  assert.equal(authSheetFraction(570, 844, 59), login, "Returning from registration releases unused space");
});

test("floating sheet spacing stays compact while expanded forms retain home-indicator clearance", () => {
  assert.equal(authSheetContentBottomInset("ios", "26.5", 34), 0);
  assert.equal(authSheetContentBottomInset("ios", "26.5", 34, true), 34);
  assert.equal(authSheetContentBottomInset("ios", "18.6", 34), 34);
  assert.equal(authSheetContentBottomInset("android", 36, 24), 24);
});

test("phone completion advances focus once, resets after deletion and never advances for invalid foreign input", () => {
  const focused = [], patched = [];
  const callback = loadCallback("src/screens/auth/index.tsx", "onPhoneChange", { patch: (value) => patched.push(value.phone), phoneComplete: { current: false }, isValidPhone, KeyboardController: { setFocusTo: (value) => focused.push(value) } });
  callback("+79991234567");
  callback("+79991234567");
  callback("+7999123456");
  callback("+86123456789");
  callback("+79991234567");
  assert.deepEqual(focused, ["next", "next"]);
  assert.equal(patched[3], "+86123456789");
});
