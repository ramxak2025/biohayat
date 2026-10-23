import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, AppState } from "react-native";
import * as Haptics from "expo-haptics";

import { useTracker } from "@/tracker/provider";
import { useTrackerClock } from "@/tracker/clock";
import type { IntakePlan } from "@/api/types";
import {
  areRemindersEnabled,
  cancelIntakeReminders,
  reminderSummary,
  getPermissionState,
  registerPushToken,
  requestNotificationPermission,
  setRemindersEnabled,
  syncIntakeReminders,
  type PermissionState,
} from "@/lib/notifications";

export interface RemindersState {
  enabled: boolean;
  permission: PermissionState;
  /** Сколько ближайших разовых напоминаний стоит в системе. */
  scheduled: number;
  busy: boolean;
  nextAt: string | null;
  scheduledUntil: string | null;
  error: string | null;
  toggle: (next: boolean) => void;
}

/**
 * Локальные напоминания курса.
 *
 * Разрешение спрашиваем в момент включения тумблера, а не на старте приложения:
 * в iOS системный диалог показывается один раз, и отказ уже не отыграть.
 * Расписание пересобирается при любом изменении списка курсов — пауза, новое
 * время, удаление.
 *
 * @param ready — список курсов уже загружен. Пока он false, синхронизацию не
 * запускаем: на пустом «ещё грузится» списке она сняла бы все напоминания и тут
 * же поставила обратно.
 */
export function useIntakeReminders(plans: readonly IntakePlan[], ready = true): RemindersState {
  const { partitionKey } = useTracker();
  const { today, timeZone } = useTrackerClock();
  const [refresh, setRefresh] = useState(0);
  const [nextAt, setNextAt] = useState<string | null>(null);
  const [scheduledUntil, setUntil] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("undetermined");
  const [scheduled, setScheduled] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [on, state, count] = await Promise.all([
        areRemindersEnabled(),
        getPermissionState(),
        reminderSummary(),
      ]);
      if (!alive) return;
      setEnabled(on);
      setPermission(state);
      setScheduled(count.scheduled); setNextAt(count.nextAt); setUntil(count.scheduledUntil);
    })().catch(e => { if (alive) setError(e instanceof Error ? e.message : "Не удалось проверить напоминания"); });
    return () => {
      alive = false;
    };
  }, [partitionKey, refresh]);

  useEffect(() => { const sub = AppState.addEventListener("change", s => { if (s === "active") setRefresh(v => v + 1); }); return () => sub.remove(); }, []);

  useEffect(() => {
    if (!ready || !enabled || permission !== "granted") return;
    let alive = true;
    void syncIntakeReminders(plans).then(() => reminderSummary()).then(summary => {
      if (alive) { setScheduled(summary.scheduled); setNextAt(summary.nextAt); setUntil(summary.scheduledUntil); setError(null); }
    }).catch(e => { if (alive) setError(e instanceof Error ? e.message : "Не удалось настроить напоминания"); });
    return () => {
      alive = false;
    };
  }, [plans, ready, enabled, permission, today, timeZone, refresh, partitionKey]);

  const toggle = useCallback(
    (next: boolean) => {
      void (async () => {
        setBusy(true); setError(null);
        try {
          if (!next) {
            await setRemindersEnabled(false);
            await cancelIntakeReminders();
            setEnabled(false);
            setScheduled(0); setNextAt(null); setUntil(null);
            void Haptics.selectionAsync();
            return;
          }

          let state = permission;
          if (state !== "granted") state = await requestNotificationPermission();
          setPermission(state);

          if (state !== "granted") {
            Alert.alert(
              "Уведомления отключены",
              "Разрешите уведомления в Настройках — иначе напоминания о приёме не придут.",
              [
                { text: "Не сейчас", style: "cancel" },
                { text: "Настройки", onPress: () => void Linking.openSettings() },
              ],
            );
            return;
          }

          await setRemindersEnabled(true);
          setEnabled(true);
          await syncIntakeReminders(plans);
          const summary = await reminderSummary(); setScheduled(summary.scheduled); setNextAt(summary.nextAt); setUntil(summary.scheduledUntil);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // пуш-токен регистрируем только теперь: разрешение уже выдано
          void registerPushToken();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Не удалось настроить напоминания");
        } finally {
          setBusy(false);
        }
      })();
    },
    [permission, plans],
  );

  return { enabled, permission, scheduled, busy, toggle, nextAt, scheduledUntil, error };
}
