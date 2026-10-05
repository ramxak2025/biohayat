import { sessionGeneration } from "@/lib/session-generation";
import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { IntakeLogRow, IntakePlan, UpdateIntakePlanBody } from "@/api/types";
import { logKey, withPlanId } from "@/components/tracker";
import { errorMessage } from "@/components/ui";
import { localDay } from "@/lib/format";

export interface LogWindow {
  from: string;
  to: string;
}

/** Все ключи логов начинаются с этого префикса — им и инвалидируем разом. */
export const intakeLogsPrefix = ["intake", "logs"] as const;

/** Ключ окна логов. planId="all" — общий запрос по всем курсам, форма ключа та же. */
const logsKey = (range: LogWindow) => qk.intakeLogs("all", range.from, range.to);

export function useIntakePlans(enabled: boolean) {
  return useQuery({
    queryKey: qk.intakePlans,
    // day влияет только на plan.logs, которые мы не используем, но пусть сервер знает наш день
    queryFn: ({ signal }) => api.intake.plans(localDay(), signal),
    enabled,
    staleTime: 30_000,
  });
}

/**
 * Отметки за окно дат.
 *
 * `plan.logs` из GET /intake НЕ используем принципиально: там «сегодня» по UTC
 * сервера, и с полуночи до 3 ночи по Москве пользователь видел бы вчерашний
 * день (риск R-2). Даты здесь — локальные, сервер сравнивает их как строки.
 */
export function useIntakeLogs(range: LogWindow, enabled: boolean) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: logsKey(range),
    queryFn: async ({ signal }): Promise<IntakeLogRow[]> => {
      try {
        return await api.intake.allLogs(range.from, range.to, signal);
      } catch (error) {
        // сборка без массового /intake/logs — добираем по каждому курсу отдельно
        if (!(error instanceof ApiError) || error.status !== 404) throw error;
        const plans = queryClient.getQueryData<IntakePlan[]>(qk.intakePlans) ?? [];
        const perPlan = await Promise.all(
          plans.map(async (plan) =>
            withPlanId(plan.id, await api.intake.logs(plan.id, range.from, range.to, signal)),
          ),
        );
        return perPlan.flat();
      }
    },
    enabled,
    staleTime: 15_000,
  });
}

export interface ToggleVars {
  planId: string;
  day: string;
  slot: string;
}

export interface ToggleController {
  toggle: (vars: ToggleVars) => void;
  isPending: (planId: string, day: string, slot: string) => boolean;
}

/**
 * Переключатель отметки.
 *
 * POST /intake/{id}/logs НЕ идемпотентен: повторный вызов снимает отметку.
 * Поэтому кнопка блокируется на время запроса, ретраев нет, а при любой ошибке
 * (включая таймаут — запрос мог дойти) мы перечитываем логи вместо повторного
 * POST. Источник правды — поле `taken` из ответа сервера.
 */
export function useToggleIntakeLog(range: LogWindow): ToggleController {
  const queryClient = useQueryClient();
  const epoch = sessionGeneration();
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  // ref нужен для синхронной защиты от двойного тапа: setState асинхронный
  const inFlight = useRef<Set<string>>(new Set());

  const release = useCallback((key: string) => {
    inFlight.current.delete(key);
    setPending(new Set(inFlight.current));
  }, []);

  const mutation = useMutation({
    retry: false,
    mutationFn: (vars: ToggleVars) =>
      api.intake.toggleLog(vars.planId, { day: vars.day, slot: vars.slot }),
    onSuccess: (result, vars) => {
      if (epoch !== sessionGeneration()) return;
      void Haptics.notificationAsync(
        result.taken ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
      );
      queryClient.setQueryData<IntakeLogRow[]>(logsKey(range), (rows = []) => {
        const without = rows.filter(
          (row) => !(row.planId === vars.planId && row.day === result.day && row.slot === result.slot),
        );
        if (!result.taken) return without;
        return [
          ...without,
          { planId: vars.planId, day: result.day, slot: result.slot, takenAt: new Date().toISOString() },
        ];
      });
    },
    onError: (error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // ничего не повторяем: запрос мог дойти до сервера и уже переключить отметку
      void queryClient.invalidateQueries({ queryKey: logsKey(range) });
      Alert.alert("Не удалось отметить приём", `${errorMessage(error)}. Мы обновили отметки — проверьте.`);
    },
    onSettled: (_data, _error, vars) => {
      release(logKey(vars.planId, vars.day, vars.slot));
    },
  });

  const toggle = useCallback(
    (vars: ToggleVars) => {
      const key = logKey(vars.planId, vars.day, vars.slot);
      if (inFlight.current.has(key)) return;
      inFlight.current.add(key);
      setPending(new Set(inFlight.current));
      mutation.mutate(vars);
    },
    [mutation],
  );

  const isPending = useCallback(
    (planId: string, day: string, slot: string) => pending.has(logKey(planId, day, slot)),
    [pending],
  );

  return { toggle, isPending };
}

export function useUpdateIntakePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, body }: { planId: string; body: UpdateIntakePlanBody }) =>
      api.intake.update(planId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.intakePlans });
    },
    onError: (error) => {
      Alert.alert("Не удалось изменить курс", errorMessage(error));
    },
  });
}

export function useDeleteIntakePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.intake.remove(planId),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: qk.intakePlans });
      // история отметок удалена каскадом — кэш логов больше не соответствует серверу
      void queryClient.invalidateQueries({ queryKey: intakeLogsPrefix });
    },
    onError: (error) => {
      Alert.alert("Не удалось удалить курс", errorMessage(error));
    },
  });
}
