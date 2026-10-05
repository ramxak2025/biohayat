import { sessionGeneration, onSessionChanged, sessionOwner } from "@/lib/session-generation";
/**
 * Локальные напоминания о приёме БАД + регистрация пуш-токена.
 *
 * Ключевое решение — одно уведомление на КАЖДОЕ ВРЕМЯ СУТОК, а не на пару
 * «курс × время». iOS держит максимум 64 запланированных уведомления и лишние
 * выбрасывает молча (без ошибки), при этом повторяющийся триггер занимает ровно
 * один слот навсегда. Наивная схема у человека с 20 курсами по два приёма съела
 * бы 40 слотов и начала терять напоминания; агрегация по времени даёт 3–6
 * слотов и один понятный банер вместо стопки из трёх.
 *
 * Триггер — DAILY: нативно это UNCalendarNotificationTrigger(hour, minute,
 * repeats: true) без привязки к календарю и часовому поясу, то есть «по стенным
 * часам устройства». Именно это нужно курсу, время которого хранится строкой
 * "09:00": переезд в другой часовой пояс и переход на летнее время учитываются
 * системой сами.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { api } from "@/api/endpoints";
import type { IntakePlan } from "@/api/types";
import { isPlanRunningOn, isValidSlot } from "@/components/tracker/plan-utils";
import { localDay } from "@/lib/format";

let notificationWork = Promise.resolve();
function serializeNotifications<T>(work: () => Promise<T>): Promise<T> {
  const result = notificationWork.then(work);
  notificationWork = result.then(() => undefined, () => undefined);
  return result;
}

/* ── Константы ───────────────────────────────────────────────────────────── */

/** Без ':' и '-' — иначе iOS может не связать категорию с уведомлением. */
export const INTAKE_CATEGORY = "intake";
export const ACTION_TAKEN = "INTAKE_TAKEN";
export const ACTION_SNOOZE = "INTAKE_SNOOZE";

const REMINDER_PREFIX = "intake.t.";
const SNOOZE_PREFIX = "intake.snooze.";
/** Бюджет из 64 системных слотов: остаток оставляем под «отложить» и пуши заказов. */
const MAX_REMINDER_SLOTS = 48;
const SNOOZE_SECONDS = 15 * 60;
const REMINDERS_KEY = "hayat.intake.reminders";

const reminderId = (slot: string) => `${REMINDER_PREFIX}${slot.replace(":", "")}`;

/* ── Поведение в активном приложении ─────────────────────────────────────── */

// Без обработчика iOS не покажет уведомление, если приложение открыто.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    // бейдж на иконке ведём сами — счётчик непринятых доз тут был бы враньём
    shouldSetBadge: false,
  }),
});

/* ── Разрешения ──────────────────────────────────────────────────────────── */

export type PermissionState = "granted" | "denied" | "undetermined";

export async function getPermissionState(): Promise<PermissionState> {
  try {
    const current = await Notifications.getPermissionsAsync();
    const ios = current.ios?.status;
    if (ios !== undefined) {
      if (
        ios === Notifications.IosAuthorizationStatus.AUTHORIZED ||
        ios === Notifications.IosAuthorizationStatus.PROVISIONAL ||
        ios === Notifications.IosAuthorizationStatus.EPHEMERAL
      ) {
        return "granted";
      }
      return ios === Notifications.IosAuthorizationStatus.NOT_DETERMINED ? "undetermined" : "denied";
    }
    if (current.granted) return "granted";
    return current.canAskAgain ? "undetermined" : "denied";
  } catch {
    return "denied";
  }
}

/**
 * Системный запрос показываем ровно в тот момент, когда человек включает
 * напоминания, — не на старте приложения. Отказ в iOS необратим из приложения,
 * второго шанса не будет.
 */
export async function requestNotificationPermission(): Promise<PermissionState> {
  const state = await getPermissionState();
  if (state !== "undetermined") return state;
  try {
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        // добавляет строку «Настройки уведомлений» внутри системных настроек
        provideAppNotificationSettings: true,
      },
    });
    const granted =
      result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
    return granted ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

/* ── Флаг «напоминания включены» ─────────────────────────────────────────── */

export async function areRemindersEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(REMINDERS_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setRemindersEnabled(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDERS_KEY, value ? "1" : "0");
  } catch {
    // отсутствие флага не должно ломать экран — напоминания просто останутся выключенными
  }
}

/* ── Категория с кнопками ────────────────────────────────────────────────── */

let categoryPromise: Promise<void> | null = null;

/**
 * Категории не переживают переустановку приложения, поэтому регистрируем их при
 * каждом запуске — до того, как уведомление может прийти.
 */
export function registerIntakeCategory(): Promise<void> {
  categoryPromise ??= Notifications.setNotificationCategoryAsync(
    INTAKE_CATEGORY,
    [
      {
        identifier: ACTION_TAKEN,
        buttonTitle: "Принял",
        // не выдёргиваем человека в приложение: отметка должна стоить одного тапа
        options: { opensAppToForeground: false },
      },
      {
        identifier: ACTION_SNOOZE,
        buttonTitle: "Отложить 15 мин",
        options: { opensAppToForeground: false },
      },
    ],
    { showTitle: true, showSubtitle: true },
  )
    .then(() => undefined)
    .catch(() => {
      categoryPromise = null;
    });
  return categoryPromise;
}

/* ── Планирование ────────────────────────────────────────────────────────── */

interface IntakeNotificationData extends Record<string, unknown> {
  kind: "intake";
  customerId: string;
  slot: string;
  planIds: string[];
}

function bodyFor(titles: string[]): string {
  if (titles.length <= 3) return titles.join(", ");
  return `${titles.slice(0, 2).join(", ")} и ещё ${titles.length - 2}`;
}

/** Снимает только НАШИ запланированные напоминания (чужие и «отложенные» не трогает). */
async function cancelByPrefix(prefixes: readonly string[], keep: ReadonlySet<string>) {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((r) => prefixes.some((p) => r.identifier.startsWith(p)) && !keep.has(r.identifier))
      .map((r) => Notifications.cancelScheduledNotificationAsync(r.identifier)),
  );
}

/**
 * Полная пересборка расписания. Идемпотентна: вызывать после создания, паузы,
 * удаления курса и при каждом открытии трекера.
 *
 * @returns сколько уведомлений в сутки реально запланировано.
 */
export function syncIntakeReminders(plans: readonly IntakePlan[]): Promise<number> {
  const epoch = sessionGeneration();
  return serializeNotifications(() => epoch === sessionGeneration() ? syncCurrentReminders(plans, epoch) : Promise.resolve(0));
}
async function syncCurrentReminders(plans: readonly IntakePlan[], epoch: number): Promise<number> {
  const customerId = sessionOwner();
  if (!customerId) return 0;
  if (!(await areRemindersEnabled())) {
    await cancelCurrentReminders();
    return 0;
  }
  if ((await getPermissionState()) !== "granted") return 0;

  await registerIntakeCategory();

  const today = localDay();
  const byTime = new Map<string, { titles: string[]; planIds: string[] }>();
  for (const plan of plans) {
    // завершённый курс не должен звенеть дальше: повторяющийся триггер сам не умрёт
    if (!plan.isActive || !isPlanRunningOn(plan, today)) continue;
    for (const slot of plan.times) {
      if (!isValidSlot(slot)) continue;
      const bucket = byTime.get(slot) ?? { titles: [], planIds: [] };
      bucket.titles.push(plan.title);
      bucket.planIds.push(plan.id);
      byTime.set(slot, bucket);
    }
  }

  const wanted = [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, MAX_REMINDER_SLOTS);

  await cancelByPrefix([REMINDER_PREFIX], new Set(wanted.map(([slot]) => reminderId(slot))));

  for (const [slot, bucket] of wanted) {
    if (epoch !== sessionGeneration()) return 0;
    const [hour, minute] = slot.split(":").map(Number);
    const identifier = reminderId(slot);
    // замена по тому же идентификатору не документирована — снимаем перед добавлением
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "Пора принять добавки",
        body: bodyFor(bucket.titles),
        sound: "default",
        categoryIdentifier: INTAKE_CATEGORY,
        // без энтайтлмента Time Sensitive iOS сам понизит уровень до active
        interruptionLevel: "timeSensitive",
        data: { kind: "intake", customerId, slot, planIds: bucket.planIds } satisfies IntakeNotificationData,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }

  return wanted.length;
}

/** Снимает все напоминания трекера, включая отложенные. */
export function cancelIntakeReminders(): Promise<void> {
  return serializeNotifications(cancelCurrentReminders);
}
onSessionChanged(() => { void cancelIntakeReminders(); });
async function cancelCurrentReminders(): Promise<void> {
  try {
    await cancelByPrefix([REMINDER_PREFIX, SNOOZE_PREFIX], new Set());
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // расписание не критично: следующий sync всё равно пересоберёт его целиком
  }
}

/** Сколько напоминаний реально стоит в системе — для подписи в интерфейсе. */
export async function countScheduledReminders(): Promise<number> {
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    return pending.filter((r) => r.identifier.startsWith(REMINDER_PREFIX)).length;
  } catch {
    return 0;
  }
}

/* ── Отметка приёма прямо из уведомления ─────────────────────────────────── */

/**
 * POST /intake/{id}/logs — ПЕРЕКЛЮЧАТЕЛЬ, а не «поставить отметку». Поэтому
 * сначала читаем логи дня: если отметка уже стоит, повторный POST её СНЯЛ бы.
 */
export async function markSlotTaken(
  planIds: readonly string[],
  slot: string,
  day = localDay(),
): Promise<void> {
  await Promise.all(
    planIds.map(async (planId) => {
      const logs = await api.intake.logs(planId, day, day);
      if (logs.some((log) => log.slot === slot)) return;
      await api.intake.toggleLog(planId, { day, slot });
    }),
  );
}

export interface IntakeNotificationEvent {
  customerId: string;
  action: "taken" | "snooze" | "open";
  slot: string;
  planIds: string[];
}

function parseIntake(response: Notifications.NotificationResponse): IntakeNotificationEvent | null {
  const data = response.notification.request.content.data as Partial<IntakeNotificationData>;
  if (data?.kind !== "intake" || typeof data.slot !== "string" || !data.customerId || data.customerId !== sessionOwner()) return null;
  const planIds = Array.isArray(data.planIds)
    ? data.planIds.filter((id): id is string => typeof id === "string")
    : [];
  if (response.actionIdentifier === ACTION_TAKEN) return { action: "taken", customerId: data.customerId, slot: data.slot, planIds };
  if (response.actionIdentifier === ACTION_SNOOZE) return { action: "snooze", customerId: data.customerId, slot: data.slot, planIds };
  return { action: "open", customerId: data.customerId, slot: data.slot, planIds };
}

async function snooze(event: IntakeNotificationEvent) {
  const epoch = sessionGeneration();
  return serializeNotifications(async () => {
    if (epoch !== sessionGeneration() || event.customerId !== sessionOwner()) return;
    await Notifications.scheduleNotificationAsync({
    identifier: `${SNOOZE_PREFIX}${Date.now()}`,
    content: {
      title: "Пора принять добавки",
      body: "Отложенное напоминание — отметьте приём",
      sound: "default",
      categoryIdentifier: INTAKE_CATEGORY,
      data: {
        kind: "intake",
        customerId: event.customerId,
        slot: event.slot,
        planIds: event.planIds,
      } satisfies IntakeNotificationData,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: SNOOZE_SECONDS,
      repeats: false,
    },
    });
  });
}

type IntakeListener = (event: IntakeNotificationEvent) => void;

const listeners = new Set<IntakeListener>();
/** Одно и то же нажатие приходит и слушателем, и через getLastNotificationResponse. */
const processed = new Set<string>();
let coldStartChecked = false;

function responseKey(response: Notifications.NotificationResponse): string {
  return `${response.notification.request.identifier}|${response.actionIdentifier}|${response.notification.date}`;
}

async function processResponse(response: Notifications.NotificationResponse): Promise<void> {
  const event = parseIntake(response);
  if (!event) return;

  const key = responseKey(response);
  if (processed.has(key)) return;
  processed.add(key);
  // память не копим: больше десятка нажатий за сессию не бывает
  if (processed.size > 32) {
    const oldest = processed.values().next().value;
    if (oldest !== undefined) processed.delete(oldest);
  }

  try {
    if (event.action === "taken") await markSlotTaken(event.planIds, event.slot);
    else if (event.action === "snooze") await snooze(event);
  } catch {
    // офлайн — экран трекера всё равно перечитает логи и покажет актуальное состояние
  }
  for (const listener of listeners) listener(event);
}

// Слушатель ставим на уровне модуля: к моменту нажатия React-дерево может быть
// ещё не смонтировано. Достаточно, чтобы модуль был импортирован при старте.
Notifications.addNotificationResponseReceivedListener((response) => {
  void processResponse(response);
});

/**
 * Подписка экрана на обработанные нажатия — по ней перечитываем кэш отметок.
 *
 * Ограничение iOS, которое не закрыть из JS: при `opensAppToForeground: false`
 * и полностью выгруженном приложении нажатие «Принял» до слушателя не дойдёт.
 * Поэтому экран трекера обязан оставаться местом, где отметку можно поставить
 * за прошедшее время вручную.
 */
export function startIntakeNotificationRouting(onHandled: IntakeListener): () => void {
  listeners.add(onHandled);

  if (!coldStartChecked) {
    coldStartChecked = true;
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      void processResponse(last);
      // иначе после каждого перемонтирования мы бы разбирали одно и то же нажатие
      Notifications.clearLastNotificationResponse();
    }
  }

  return () => {
    listeners.delete(onHandled);
  };
}

/* ── Пуш-токен ───────────────────────────────────────────────────────────── */

/**
 * Регистрируем токен ТОЛЬКО при выданном разрешении: иначе на бэкенде копятся
 * мёртвые записи, а APNs всё равно ничего не доставит.
 */
export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  if ((await getPermissionState()) !== "granted") return null;

  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const projectId = extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.devices.register({
      platform: Platform.OS === "android" ? "android" : "ios",
      pushToken: data,
      appVersion: Application.nativeApplicationVersion ?? undefined,
    });
    return data;
  } catch {
    // сеть/APNs могут отвалиться — повторим при следующем входе на экран
    return null;
  }
}

/** APNs изредка меняет токен на живом приложении — иначе накопим мёртвые записи. */
export function watchPushToken(): () => void {
  const subscription = Notifications.addPushTokenListener(() => {
    void registerPushToken();
  });
  return () => subscription.remove();
}
