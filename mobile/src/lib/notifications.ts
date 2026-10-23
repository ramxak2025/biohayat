import { sessionGeneration, onSessionChanged, sessionOwner } from "@/lib/session-generation";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "@/api/endpoints";
import type { IntakePlan } from "@/api/types";
import type { TrackerPlan } from "@/tracker/types";
import { reminderOccurrences } from "@/tracker/reminder-schedule";
import { isCalendarDay, isSlot } from "@/tracker/calendar";
import { API_BASE } from "@/api/config";
import { localDay } from "@/lib/format";

let notificationWork = Promise.resolve();
function serializeNotifications<T>(work: () => Promise<T>): Promise<T> {
  const result = notificationWork.catch(() => undefined).then(work);
  notificationWork = result.then(() => undefined, () => undefined); return result;
}
export const INTAKE_CATEGORY = "intake";
export const ACTION_TAKEN = "INTAKE_TAKEN";
export const ACTION_SNOOZE = "INTAKE_SNOOZE";
const PREFIX = "intake.v2.";
const LEGACY = ["intake.t.", "intake.snooze."];
const owner = () => sessionOwner() ?? "guest";
const prefKey = (who = owner()) => `hayat.intake.reminders.v2.${encodeURIComponent(API_BASE)}.${who}`;
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
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


export async function areRemindersEnabled() { return (await AsyncStorage.getItem(prefKey())) === "1"; }
export async function setRemindersEnabled(value: boolean) { await AsyncStorage.setItem(prefKey(), value ? "1" : "0"); }
let categoryPromise: Promise<void> | null = null;
export function registerIntakeCategory() {
  categoryPromise ??= Notifications.setNotificationCategoryAsync(INTAKE_CATEGORY, [
    { identifier: ACTION_TAKEN, buttonTitle: "Принято", options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE, buttonTitle: "Через 15 минут", options: { opensAppToForeground: true } },
  ]).then(() => undefined).catch(e => { categoryPromise = null; throw e; });
  return categoryPromise;
}
const isOurs = (id: string) => id.startsWith(PREFIX) || LEGACY.some(p => id.startsWith(p));
async function cancelCurrentReminders() {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const r of pending) if (isOurs(r.identifier)) await Notifications.cancelScheduledNotificationAsync(r.identifier);
}
export function cancelIntakeReminders() { return serializeNotifications(cancelCurrentReminders); }
onSessionChanged(() => { void cancelIntakeReminders().catch(() => undefined); });
export function syncIntakeReminders(plans: readonly IntakePlan[]): Promise<number> {
  const epoch = sessionGeneration(); const who = owner();
  return serializeNotifications(async () => {
    if (epoch !== sessionGeneration() || who !== owner()) return 0;
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const others = all.filter(r => !isOurs(r.identifier));
    const snoozes = all.filter(r => r.identifier.startsWith(`${PREFIX}snooze.`) && r.content.data?.owner === who);
    // Reserve four OS slots; all other app requests, including snoozes, count toward the limit.
    const budget = Math.max(0, 60 - others.length - snoozes.length);
    const enabled = await areRemindersEnabled();
    const wanted = enabled && await getPermissionState() === 'granted' ? reminderOccurrences(plans.map(p => ({ ...p, anchorDay: p.anchorDay ?? localDay(new Date(p.startDate)), intervalDays: p.intervalDays ?? 1 })) as TrackerPlan[], new Date(), localDay(), budget) : [];
    for (const r of all) if (isOurs(r.identifier) && (!r.identifier.startsWith(`${PREFIX}snooze.`) || !enabled || r.content.data?.owner !== who)) await Notifications.cancelScheduledNotificationAsync(r.identifier);
    if (wanted.length) await registerIntakeCategory();
    for (const r of wanted) {
      if (epoch !== sessionGeneration() || who !== owner()) return 0;
      await Notifications.scheduleNotificationAsync({ identifier: `${PREFIX}${r.day}.${r.slot.replace(':','')}`,
        content: { title: 'Пора принять добавки', body: r.titles.slice(0, 3).join(', ') + (r.titles.length > 3 ? ` и ещё ${r.titles.length - 3}` : ''), sound: 'default', categoryIdentifier: INTAKE_CATEGORY,
          data: { kind: 'intake', backend: API_BASE, owner: who, day: r.day, slot: r.slot, planIds: r.planIds } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
      });
    }
    return wanted.length;
  });
}
export async function reminderSummary() {
  const pending = (await Notifications.getAllScheduledNotificationsAsync()).filter(r => r.identifier.startsWith(PREFIX) && r.content.data?.owner === owner());
  const dates = await Promise.all(pending.map(r => Notifications.getNextTriggerDateAsync(r.trigger as Notifications.SchedulableNotificationTriggerInput)));
  const sorted = dates.filter((d): d is number => typeof d === 'number').sort((a,b) => a-b);
  return { scheduled: pending.length, nextAt: sorted.length ? new Date(sorted[0]).toISOString() : null, scheduledUntil: sorted.length ? new Date(sorted[sorted.length-1]).toISOString() : null };
}
export async function countScheduledReminders() { return (await reminderSummary()).scheduled; }
export interface IntakeNotificationEvent { customerId: string; action: 'taken' | 'snooze' | 'open'; day: string; slot: string; planIds: string[]; deliveryId: string }
type Handler = (event: IntakeNotificationEvent) => Promise<void>;
let actionHandler: { owner: string; handle: Handler } | null = null;
const waiting = new Map<string, Notifications.NotificationResponse>();
const listeners = new Set<(event: IntakeNotificationEvent) => void>();
const processed = new Set<string>();
function parse(response: Notifications.NotificationResponse): IntakeNotificationEvent | null {
  const data = response.notification.request.content.data;
  if (data?.kind !== 'intake' || data.backend !== API_BASE || data.owner !== owner() || typeof data.day !== 'string' || !isCalendarDay(data.day) || typeof data.slot !== 'string' || !isSlot(data.slot) || !Array.isArray(data.planIds)) return null;
  return { customerId: String(data.owner), day: data.day, slot: data.slot, planIds: data.planIds.filter((id): id is string => typeof id === 'string'), action: response.actionIdentifier === ACTION_TAKEN ? 'taken' : response.actionIdentifier === ACTION_SNOOZE ? 'snooze' : 'open', deliveryId: `${response.notification.request.identifier}|${response.actionIdentifier}|${response.notification.date}` };
}
async function process(response: Notifications.NotificationResponse) {
  const event = parse(response); if (!event || processed.has(event.deliveryId)) return;
  if (!actionHandler || actionHandler.owner !== event.customerId) { waiting.set(event.deliveryId, response); return; }
  try {
    if (event.action === 'taken') await actionHandler.handle(event);
    if (event.action === 'snooze') await serializeNotifications(async () => {
      if (owner() !== event.customerId) return;
      const pending = await Notifications.getAllScheduledNotificationsAsync();
      const identifier = `${PREFIX}snooze.${response.notification.request.identifier}`;
      if (pending.some(r => r.identifier === identifier)) return;
      if (pending.length >= 60) throw new Error('Лимит напоминаний');
      await Notifications.scheduleNotificationAsync({ identifier, content: { title: 'Пора принять добавки', body: 'Отложенное напоминание', sound: 'default', categoryIdentifier: INTAKE_CATEGORY, data: { kind: 'intake', backend: API_BASE, owner: event.customerId, day: event.day, slot: event.slot, planIds: event.planIds } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 900, repeats: false } });
    });
    processed.add(event.deliveryId); waiting.delete(event.deliveryId);
    await Notifications.clearLastNotificationResponseAsync();
    for (const listener of listeners) listener(event);
  } catch { waiting.set(event.deliveryId, response); /* Durable write failed: keep response for a foreground retry. */ }
}
Notifications.addNotificationResponseReceivedListener(response => { const key = response.notification.request.identifier; waiting.set(key, response); void process(response); });
export function setIntakeActionHandler(who: string, handle: Handler) {
  actionHandler = { owner: who, handle };
  const last = Notifications.getLastNotificationResponse(); if (last) waiting.set('cold', last);
  for (const response of waiting.values()) void process(response);
  return () => { if (actionHandler?.handle === handle) actionHandler = null; };
}
export function startIntakeNotificationRouting(listener: (event: IntakeNotificationEvent) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export async function markSlotTaken(planIds: readonly string[], slot: string, day = localDay()) {
  if (!actionHandler) throw new Error('Откройте трекер, чтобы сохранить отметку');
  await actionHandler.handle({ customerId: owner(), action: 'taken', day, slot, planIds: [...planIds], deliveryId: `manual|${day}|${slot}|${planIds.join(',')}` });
}
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
