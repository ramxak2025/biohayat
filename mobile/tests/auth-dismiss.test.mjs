import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { loader } from "./load-ts.mjs";

const require = createRequire(import.meta.url);
const { StackRouter } = require("expo-router/build/react-navigation/routers/StackRouter.js");
const stackRouter = StackRouter({});
const stackOptions = { routeNames: ["tabs", "detail", "auth"], routeParamList: {}, routeGetIdList: {} };
const initial = () => ({ stale: false, type: "stack", key: "root-stack", index: 2,
  routeNames: stackOptions.routeNames,
  routes: [{ key: "tabs-key", name: "tabs" }, { key: "detail-key", name: "detail" }, { key: "auth-key", name: "auth" }] });

function setup(state = initial()) {
  let focused = true;
  let cleanup;
  const listeners = {};
  const calls = [];
  const navigation = {
    isFocused: () => focused,
    getState: () => state,
    addListener: (event, callback) => { listeners[event] = callback; return () => delete listeners[event]; },
    dispatch: (action) => { calls.push(["dispatch", action]); state = stackRouter.getStateForAction(state, action, stackOptions) ?? state; },
  };
  const { useAuthDismiss } = loader({
    react: { useRef: (value) => ({ current: value }), useCallback: (fn) => fn, useEffect: (fn) => { cleanup = fn(); } },
    "react-native": { Keyboard: { dismiss: () => calls.push(["keyboard"]) } },
    "expo-router": { useNavigation: () => navigation, useRoute: () => ({ key: "auth-key" }), useRouter: () => ({ replace: (path) => calls.push(["replace", path]) }) },
  })("src/screens/auth/use-auth-dismiss.ts");
  return { close: useAuthDismiss(), calls, listeners, state: () => state, focus: (value) => { focused = value; }, unmount: () => cleanup() };
}

test("explicit dismissal then a delayed login completion closes only the auth route", async () => {
  const h = setup();
  let resolveLogin;
  const lateSuccess = new Promise((resolve) => { resolveLogin = resolve; }).then(h.close);
  h.close();
  resolveLogin();
  await lateSuccess;
  assert.deepEqual(h.state().routes.map((route) => route.name), ["tabs", "detail"]);
  assert.equal(h.calls.filter(([type]) => type === "dispatch").length, 1);
  assert.equal(h.calls.filter(([type]) => type === "keyboard").length, 1);
});

test("native removal and unmount invalidate an already captured success callback", () => {
  for (const dismiss of [(h) => h.listeners.beforeRemove(), (h) => h.unmount()]) {
    const h = setup();
    dismiss(h);
    h.close();
    assert.deepEqual(h.calls, []);
  }
});

test("live focus blocks stale callbacks but a canceled swipe does not latch dismissal", () => {
  const h = setup();
  h.focus(false); h.close();
  assert.deepEqual(h.calls, []);
  h.focus(true); h.close();
  assert.equal(h.calls.filter(([type]) => type === "dispatch").length, 1);
});

test("a stale source-bound action cannot pop the underlying screen after UIKit removed auth", () => {
  const h = setup(); h.close();
  const action = h.calls.find(([type]) => type === "dispatch")[1];
  assert.equal(action.source, "auth-key");
  assert.equal(action.target, "root-stack");
  assert.equal(stackRouter.getStateForAction(h.state(), action, stackOptions), null);
});

test("direct auth entry falls back home once, while a missing auth route does nothing", () => {
  const lone = initial(); lone.routes = [lone.routes[2]]; lone.index = 0;
  const h = setup(lone); h.close(); h.close();
  assert.deepEqual(h.calls, [["keyboard"], ["replace", "/"]]);
  const gone = initial(); gone.routes.pop(); gone.index = 1;
  const stale = setup(gone); stale.close();
  assert.deepEqual(stale.calls, []);
});
