import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Ключ настройки напоминаний трекера. Живёт локально: сервер пуши не отправляет
 * (POST /devices только сохраняет токен), поэтому напоминания планирует само
 * устройство по временам приёма из курсов.
 */
export const INTAKE_REMINDERS_KEY = "hayat.prefs.intakeReminders";

export interface IntakeRemindersState {
  enabled: boolean;
  /** false, пока читаем AsyncStorage — переключатель до этого не трогаем. */
  ready: boolean;
  setEnabled: (next: boolean) => void;
}

export function useIntakeReminders(): IntakeRemindersState {
  const [enabled, setStateEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(INTAKE_REMINDERS_KEY);
        if (alive) setStateEnabled(stored === "1");
      } finally {
        if (alive) setReady(true);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setStateEnabled(next);
    void AsyncStorage.setItem(INTAKE_REMINDERS_KEY, next ? "1" : "0").catch(() => undefined);
  }, []);

  return { enabled, ready, setEnabled };
}
