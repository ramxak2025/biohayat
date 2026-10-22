import assert from "node:assert/strict";
import test from "node:test";
import { loader } from "./load-ts.mjs";
class ApiError extends Error { constructor(status) { super("failure"); this.status = status; } }
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(mode, failure) {
  const state = [], refs = [];
  let cursor = 0, refCursor = 0, requests = [], successes = 0;
  const { useAuthForm } = loader({
    react: {
      useState(initial) { const slot = cursor++; if (!(slot in state)) state[slot] = initial; return [state[slot], value => { state[slot] = typeof value === "function" ? value(state[slot]) : value; }]; },
      useRef(initial) { const slot = refCursor++; return refs[slot] ??= { current: initial }; },
      useCallback: fn => fn,
    },
    "expo-haptics": { notificationAsync: async () => {}, NotificationFeedbackType: {} },
    "@tanstack/react-query": { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
    "@/hooks/use-favorites": { mergeGuestFavorites: async () => {} },
    "@/store/auth": { useAuth: select => select({
      login: async body => { requests.push(body); if (failure) throw failure; },
      register: async body => { requests.push(body); if (failure) throw failure; },
    }) },
    "@/api/client": { ApiError },
  })("src/screens/auth/use-auth-form.ts");
  return { render() { cursor = refCursor = 0; return useAuthForm(mode, () => { successes++; }); }, requests, get successes() { return successes; } };
}
test("unchecked registration blocks a valid form and sends selected consent version only after a manual choice", async () => {
  const h = harness("register");
  assert.equal(h.render().values.consent, false);
  h.render().patch({ phone: "+79991234567", name: "Тестер", password: "test-password" });
  h.render().submit();
  assert.equal(h.requests.length, 0);
  assert.ok(h.render().fieldErrors.consent);
  h.render().patch({ consent: true });
  const form = h.render(); form.submit(); form.submit();
  await tick();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].consent, true);
  assert.equal(h.requests[0].consentVersion, "2026-10-22");
  assert.equal(h.successes, 1);
});
test("recovery only follows rejected credentials and resets for another phone", async () => {
  for (const status of [401, 400, 429, 500]) {
    const h = harness("login", new ApiError(status));
    assert.equal(h.render().showRecovery, false);
    h.render().submit();
    assert.equal(h.render().showRecovery, false);
    h.render().patch({ phone: "+79991234567", password: "bad-password" });
    h.render().submit(); await tick();
    assert.equal(h.render().showRecovery, status === 401);
    h.render().patch({ phone: "+79991234568" });
    assert.equal(h.render().showRecovery, false);
  }
});

test("withdrawing the choice prevents another registration request", () => {
  const h = harness("register");
  h.render().patch({ phone: "+79991234567", name: "Тестер", password: "test-password", consent: true });
  h.render().patch({ consent: false });
  h.render().submit();
  assert.equal(h.requests.length, 0);
});
