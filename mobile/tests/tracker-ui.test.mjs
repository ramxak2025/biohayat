import assert from "node:assert/strict";
import test from "node:test";
import { loader } from "./load-ts.mjs";

const tokens = loader()("src/theme/tokens.ts");
const theme = { ...tokens, useColors: () => tokens.darkColors };
const native = { Platform: { OS: "ios" }, StyleSheet: { create: (value) => value, hairlineWidth: .5 }, View: "View", Switch: "Switch", KeyboardAvoidingView: "KeyboardAvoidingView", ScrollView: "ScrollView" };
const ui = Object.fromEntries(["AppText", "Button", "Card", "Chip", "Input", "PressableScale", "Screen", "Divider", "IconButton"].map((name) => [name, name]));
const nodes = (value) => !value || typeof value !== "object" ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children), ...nodes(value.props?.footer)];
function text(value) { return nodes(value).filter((node) => node.type === "AppText").map((node) => [node.props.children].flat(Infinity).filter((part) => typeof part === "string" || typeof part === "number").join("")).join("\n"); }
const hooks = { useState: (value) => [typeof value === "function" ? value() : value, () => {}], useRef: (value) => ({ current: value }), useEffect() {}, useCallback: (fn) => fn };
const today = "2026-10-23";
const plan = { id: "plan-1", productId: null, title: "Длинное русское название курса витаминов и минералов", anchorDay: today, intervalDays: 4, durationDays: 30, times: ["09:00"], note: null, isActive: true, startDate: `${today}T00:00:00Z`, revision: 1, scheduleVersion: 2, logs: [] };
function controller(overrides = {}) {
  return { partitionKey: "guest:test", access: "guest", hydrated: true, plansKnown: true, storageError: null, syncError: null, plans: [plan], logs: [], ranges: [], pendingCount: 0, syncing: false, online: false, lastSyncedAt: null, conflicts: [], guestPlanCount: 0, isDayKnown: () => true, planSyncState: () => "local", savePlan: async () => plan.id, setActive: async () => {}, removePlan: async () => {}, setTaken: async () => {}, sync: async () => {}, reload: async () => {}, resolveConflict: async () => {}, importGuest: async () => {}, ...overrides };
}

test("four-day cadence preview is anchored to civil dates and historical rows contain facts only", () => {
  const { nextDueDays } = loader()("src/tracker/calendar.ts");
  const { selectedDayRows } = loader()("src/components/tracker/presentation.ts");
  assert.deepEqual(Array.from(nextDueDays(plan, today, 3)), [today, "2026-10-27", "2026-10-31"]);
  assert.equal(selectedDayRows([plan], [], "2026-10-24", "2026-10-24").length, 0);
  const actual = { planId: plan.id, day: "2026-10-22", slot: "20:00", takenAt: "2026-10-22T20:00:00Z" };
  const history = selectedDayRows([{ ...plan, times: ["08:00"] }], [actual], actual.day, today);
  assert.equal(history.length, 1);
  assert.equal(history[0].slot, "20:00");
  assert.equal(history[0].taken, true);
  assert.equal(history[0].scheduled, false);
  assert.equal(selectedDayRows([plan], [], actual.day, today).length, 0, "No retroactive missed-dose rows from today's schedule");
});

test("guest loss warning is explicit and guest import happens only after a deliberate account action", async () => {
  let imports = 0;
  const { TrackerState } = loader({ react: hooks, "react-native": native, "expo-router": { useRouter: () => ({ push() {} }) }, "@/components/ui": ui, "@/theme": theme })("src/components/tracker/tracker-state.tsx");
  const guest = TrackerState({ tracker: controller() });
  assert.match(text(guest), /только на этом устройстве/);
  assert.match(text(guest), /удалении приложения или смене устройства/);
  const account = TrackerState({ tracker: controller({ access: "account", guestPlanCount: 2, importGuest: async () => { imports++; } }) });
  assert.equal(imports, 0);
  nodes(account).find((node) => node.type === "Button" && node.props.title === "Перенести в этот аккаунт").props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(imports, 1);
  const broken = TrackerState({ tracker: controller({ hydrated: false, storageError: "Нет ключа" }) });
  assert.match(text(broken), /Данные на устройстве недоступны/);
  assert.ok(nodes(broken).some((node) => node.type === "Button" && node.props.title === "Повторить загрузку"));
});

test("deleted remote conflict offers explicit new-copy recovery without resurrecting a plan", async () => {
  const chosen = [];
  const { TrackerConflicts } = loader({ react: hooks, "react-native": native, "expo-router": {}, "@/components/ui": ui, "@/theme": theme })("src/components/tracker/tracker-state.tsx");
  const tracker = controller({ conflicts: [{ id: "conflict-1", planId: plan.id, title: plan.title, message: "Курс удалён на сайте", deletedRemotely: true }], resolveConflict: async (...args) => chosen.push(args) });
  const tree = TrackerConflicts({ tracker });
  assert.equal(chosen.length, 0);
  assert.match(text(tree), /отдельным новым курсом/);
  nodes(tree).find((node) => node.type === "Button" && node.props.title === "Сохранить отдельным курсом").props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(chosen[0][0], "conflict-1");
  assert.equal(chosen[0][1], "local");
});

test("unknown history never becomes a zero-progress denominator and a rest day displays the next occurrence", () => {
  const { TrackerBody } = loader({
    react: hooks, "react-native": native, "expo-router": { Stack: { Screen: "StackScreen" }, useRouter: () => ({ push() {} }) },
    "@/tracker/provider": {}, "@/tracker/clock": { useTrackerClock: () => ({ today: "2026-10-24", timeZone: "Europe/Moscow" }) },
    "@/components/ui": ui, "@/components/tracker/day-summary": { DaySummary: "DaySummary" }, "@/components/tracker/intake-row": { IntakeRow: "IntakeRow" },
    "@/components/tracker/tracker-state": { TrackerState: "TrackerState", TrackerConflicts: "Conflicts" }, "@/components/tracker/tracker-skeleton": { TrackerSkeleton: "Skeleton" },
    "@/components/tracker/reminders-card": { RemindersCard: "Reminders" }, "@/components/tracker/use-reminders": { useIntakeReminders: () => ({}) }, "@/theme": theme,
  })("src/screens/tracker/index.tsx");
  const rest = TrackerBody({ tracker: controller() });
  assert.match(text(rest), /Сегодня свободный день/);
  assert.match(text(rest), /27 октября/);
  const unknown = TrackerBody({ tracker: controller({ isDayKnown: () => false }) });
  assert.match(text(unknown), /История за этот день пока неизвестна/);
  assert.equal(nodes(unknown).find((node) => node.type === "DaySummary").props.known, false);
  assert.doesNotMatch(text(unknown), /Сегодня свободный день/);
  const { DaySummary } = loader({ "react-native": native, "@/components/ui": ui, "@/theme": theme, "./week-strip": { WeekStrip: "Week" } })("src/components/tracker/day-summary.tsx");
  const summary = DaySummary({ day: today, today, known: false, planned: 3, taken: 0, recorded: 0, days: [], onSelectDay() {} });
  assert.doesNotMatch(text(summary), /0 из 3/);
  assert.equal(nodes(summary).some((node) => node.props.accessibilityRole === "progressbar"), false);
});

function formHarness(tracker, { focused = () => true, done = () => {}, initialTitle = "Мой курс" } = {}) {
  const states = [], refs = [], cleanups = [];
  let cursor = 0, refCursor = 0, drafts = 0, first = true;
  const { PlanForm } = loader({
    react: {
      useState(initial) { const slot = cursor++; if (!(slot in states)) states[slot] = typeof initial === "function" ? initial() : initial; return [states[slot], (value) => { states[slot] = typeof value === "function" ? value(states[slot]) : value; }]; },
      useRef(initial) { return refs[refCursor++] ??= { current: initial }; },
      useEffect(fn) { if (first) cleanups.push(fn()); },
    },
    "react-native": native, "expo-router": { useNavigation: () => ({ isFocused: focused }) }, "@/tracker/ids": { newTrackerId: () => `draft-${++drafts}` },
    "@/components/ui": ui, "@/theme": theme, "./time-list": { TimeList: "TimeList" }, "./schedule-picker": { SchedulePicker: "Picker" },
  })("src/components/tracker/plan-form.tsx");
  return { render() { cursor = refCursor = 0; const result = PlanForm({ tracker, today, initialTitle, onDone: done }); first = false; return result; }, unmount() { cleanups.forEach((fn) => fn?.()); }, get drafts() { return drafts; } };
}

test("form waits for durable storage, reuses its draft ID after failure and previews every four days", async () => {
  const calls = [];
  let resolveWrite, rejectWrite, done = 0;
  const tracker = controller({ savePlan: (body, id) => { calls.push({ body, id }); return new Promise((resolve, reject) => { resolveWrite = resolve; rejectWrite = reject; }); } });
  const h = formHarness(tracker, { done: () => done++ });
  let tree = h.render();
  assert.match(text(tree), /удалении приложения или смене устройства/);
  nodes(tree).find((node) => node.type === "Chip" && node.props.label === "С интервалом").props.onPress();
  tree = h.render();
  assert.match(text(tree), /23 октября.*27 октября.*31 октября/);
  const submit = () => nodes(h.render()).find((node) => node.type === "Button" && node.props.title === "Создать курс").props.onPress();
  submit(); submit();
  assert.equal(calls.length, 1);
  assert.equal(done, 0);
  assert.equal(calls[0].body.intervalDays, 4);
  rejectWrite(new Error("disk full")); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(done, 0);
  submit();
  assert.equal(calls[1].id, calls[0].id);
  assert.equal(h.drafts, 1);
  resolveWrite(calls[1].id); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(done, 1);
});

test("invalid intervals cannot be silently truncated into a valid schedule and stale route completion cannot pop", async () => {
  let writes = 0, finish, done = 0, focused = true;
  const h = formHarness(controller({ savePlan: () => { writes++; return new Promise((resolve) => { finish = resolve; }); } }), { focused: () => focused, done: () => done++ });
  let tree = h.render();
  nodes(tree).find((node) => node.type === "Chip" && node.props.label === "С интервалом").props.onPress();
  for (const value of ["0", "366", "4.5"]) {
    tree = h.render(); nodes(tree).find((node) => node.type === "Input" && node.props.label === "Интервал, дней").props.onChangeText(value);
    nodes(h.render()).find((node) => node.type === "Button" && node.props.title === "Создать курс").props.onPress();
    assert.equal(writes, 0);
  }
  tree = h.render(); nodes(tree).find((node) => node.type === "Input" && node.props.label === "Интервал, дней").props.onChangeText("4");
  nodes(h.render()).find((node) => node.type === "Button" && node.props.title === "Создать курс").props.onPress();
  focused = false; h.unmount(); finish("id"); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(done, 0);
});

test("slot feedback is controlled by persisted taken state and Reduce Motion removes spatial scaling", () => {
  for (const reduced of [true, false]) {
    const timing = [];
    const { SlotChip } = loader({
      react: { useEffect: (fn) => fn() }, "react-native": { ...native, ActivityIndicator: "Spinner" }, "expo-symbols": { SymbolView: "Symbol" },
      "react-native-reanimated": { default: { View: "Animated" }, useReducedMotion: () => reduced, useSharedValue: (value) => ({ value }), useAnimatedStyle: (fn) => fn(), withTiming: (value, options) => { timing.push(options.duration); return value; } },
      "@/components/ui": ui, "@/theme": theme,
    })("src/components/tracker/slot-chip.tsx");
    let tapped = 0;
    const tree = SlotChip({ time: "09:00", taken: false, onPress: () => tapped++ });
    tree.props.onPress(); assert.equal(tapped, 1); assert.equal(tree.props.accessibilityState.checked, false);
    assert.equal(tree.props.scale, reduced ? 1 : .985);
    assert.equal(timing[0], reduced ? 0 : 180);
    const unknown = SlotChip({ time: "09:00", taken: false, unknown: true, onPress() {} });
    assert.equal(unknown.props.accessibilityRole, "button");
    assert.equal(unknown.props.accessibilityState.checked, undefined);
    assert.match(unknown.props.accessibilityLabel, /на телефоне/);
  }
});

test("notification denial/error is separate from course durability and names remain fully readable", () => {
  const { RemindersCard } = loader({ "react-native": native, "@/components/ui": ui, "@/theme": theme })("src/components/tracker/reminders-card.tsx");
  const reminder = RemindersCard({ state: { enabled: false, permission: "denied", scheduled: 0, busy: false, toggle() {}, error: "Нет доступа" } });
  assert.match(text(reminder), /Система не разрешает/);
  assert.match(text(reminder), /Сохранённые курсы и отметки остаются/);
  assert.ok(nodes(reminder).some((node) => node.type === "Button" && node.props.title === "Открыть настройки устройства"));
  const { PlanCard } = loader({ react: hooks, "react-native": native, "@/components/ui": ui, "@/theme": theme })("src/components/tracker/plan-card.tsx");
  const card = PlanCard({ plan, today, syncState: "queued", onEdit() {}, onTogglePause: async () => {}, onDelete: async () => {} });
  const name = nodes(card).find((node) => node.type === "AppText" && node.props.children === plan.title);
  assert.equal(name.props.numberOfLines, undefined);
  assert.match(text(card), /Ожидает отправки/);
});
