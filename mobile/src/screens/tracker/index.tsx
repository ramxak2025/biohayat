import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import type { IntakePlan } from "@/api/types";
import {
  AuthInvite,
  DaySummary,
  PlanCard,
  RemindersCard,
  TrackerSkeleton,
  buildLogIndex,
  computeStreak,
  dayProgress,
  logKey,
  logWindow,
  planDayState,
  sortSlots,
  useIntakeReminders,
  weekDays,
} from "@/components/tracker";
import {
  AppText,
  BadDisclaimer,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  Screen,
} from "@/components/ui";
import { localDay, plural } from "@/lib/format";
import { startIntakeNotificationRouting, watchPushToken } from "@/lib/notifications";
import { useIsAuthenticated } from "@/store/auth";
import { spacing } from "@/theme";

import {
  intakeLogsPrefix,
  useDeleteIntakePlan,
  useIntakeLogs,
  useIntakePlans,
  useToggleIntakeLog,
  useUpdateIntakePlan,
} from "./use-intake";

/** Порядок карточек: сначала то, что нужно сделать сегодня. */
const STATE_ORDER = { running: 0, upcoming: 1, finished: 2, paused: 3 } as const;

export function TrackerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  // день держим в состоянии: приложение может провисеть открытым через полночь
  const [today, setToday] = useState(localDay);
  const [selectedDay, setSelectedDay] = useState(today);

  const range = useMemo(() => logWindow(today), [today]);

  const plansQuery = useIntakePlans(isAuthenticated);
  const logsQuery = useIntakeLogs(range, isAuthenticated);
  const updatePlan = useUpdateIntakePlan();
  const deletePlan = useDeleteIntakePlan();
  const { toggle, isPending } = useToggleIntakeLog(range);

  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const logIndex = useMemo(() => buildLogIndex(logsQuery.data ?? []), [logsQuery.data]);
  const days = useMemo(() => weekDays(today), [today]);

  const progressOf = useCallback(
    (day: string) => dayProgress(plans, logIndex, day),
    [plans, logIndex],
  );
  const streak = useMemo(() => computeStreak(plans, logIndex, today), [plans, logIndex, today]);

  // хук живёт на экране, а не в карточке: удалив последний курс, мы обязаны снять
  // уже запланированные уведомления — а карточка к этому моменту размонтирована
  const reminders = useIntakeReminders(plans, !isAuthenticated || plansQuery.isSuccess);

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) => {
        const byState = STATE_ORDER[planDayState(a, selectedDay)] - STATE_ORDER[planDayState(b, selectedDay)];
        if (byState !== 0) return byState;
        return (sortSlots(a.times)[0] ?? "").localeCompare(sortSlots(b.times)[0] ?? "");
      }),
    [plans, selectedDay],
  );

  useFocusEffect(
    useCallback(() => {
      const current = localDay();
      if (current !== today) {
        setToday(current);
        setSelectedDay(current);
      }
      // отметку могли поставить из уведомления, пока экран был в фоне
      void queryClient.invalidateQueries({ queryKey: intakeLogsPrefix });
    }, [today, queryClient]),
  );

  useEffect(() => {
    // нажатие «Принял» в уведомлении пишет лог мимо экрана — перечитываем кэш
    const stopRouting = startIntakeNotificationRouting(() => {
      void queryClient.invalidateQueries({ queryKey: intakeLogsPrefix });
    });
    // APNs изредка меняет токен на живом приложении — иначе накопим мёртвые записи
    const stopToken = watchPushToken();
    return () => {
      stopRouting();
      stopToken();
    };
  }, [queryClient]);

  const goCreate = useCallback(() => {
    router.push("./new" as `./${string}`, { relativeToDirectory: true });
  }, [router]);

  const onTogglePause = useCallback(
    (plan: IntakePlan) => {
      void Haptics.selectionAsync();
      updatePlan.mutate({ planId: plan.id, body: { isActive: !plan.isActive } });
    },
    [updatePlan],
  );

  const onDelete = useCallback(
    (plan: IntakePlan) => {
      Alert.alert(
        "Удалить курс?",
        `«${plan.title}» и вся история отметок по нему будут удалены безвозвратно — восстановить их не получится.`,
        [
          { text: "Отмена", style: "cancel" },
          { text: "Удалить", style: "destructive", onPress: () => deletePlan.mutate(plan.id) },
        ],
      );
    },
    [deletePlan],
  );

  const busyPlanId = updatePlan.isPending
    ? updatePlan.variables?.planId
    : deletePlan.isPending
      ? deletePlan.variables
      : undefined;

  const header = (
    <Stack.Screen
      options={{
        title: "Трекер",
        headerRight: () =>
          isAuthenticated ? (
            <IconButton name="plus" label="Добавить курс" size={20} onPress={goCreate} />
          ) : null,
      }}
    />
  );

  if (!isAuthenticated) {
    return (
      <>
        {header}
        <AuthInvite subtitle="Курсы приёма и отметки хранятся в личном кабинете, поэтому для трекера нужен вход." />
      </>
    );
  }

  if (plansQuery.isLoading) {
    return (
      <>
        {header}
        <Screen scroll>
          <TrackerSkeleton />
        </Screen>
      </>
    );
  }

  if (plansQuery.isError) {
    return (
      <>
        {header}
        <Screen>
          <View style={styles.center}>
            <ErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} />
          </View>
        </Screen>
      </>
    );
  }

  if (plans.length === 0) {
    return (
      <>
        {header}
        <Screen>
          <View style={styles.center}>
            <EmptyState
              icon="pills"
              title="Заведите первый курс"
              subtitle="Трекер напомнит о приёме, посчитает дни курса и покажет, сколько раз подряд вы ничего не пропустили. Добавки работают только тогда, когда их принимают регулярно."
              actionLabel="Добавить курс"
              onAction={goCreate}
            />
          </View>
        </Screen>
      </>
    );
  }

  const progress = progressOf(selectedDay);

  return (
    <>
      {header}
      <Screen
        scroll
        refreshing={plansQuery.isRefetching || logsQuery.isRefetching}
        onRefresh={() => {
          void plansQuery.refetch();
          void logsQuery.refetch();
        }}
      >
        <View style={styles.content}>
          <DaySummary
            day={selectedDay}
            today={today}
            progress={progress}
            streak={streak}
            days={days}
            progressOf={progressOf}
            onSelectDay={setSelectedDay}
          />

          {logsQuery.isError ? (
            <ErrorState
              error={logsQuery.error}
              title="Не удалось загрузить отметки"
              onRetry={() => void logsQuery.refetch()}
              compact
            />
          ) : null}

          <RemindersCard state={reminders} />

          <View style={styles.sectionHeader}>
            <AppText variant="title3">Курсы</AppText>
            <AppText variant="footnote" color="faint">
              {plans.length} {plural(plans.length, "курс", "курса", "курсов")}
            </AppText>
          </View>

          {sortedPlans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              day={selectedDay}
              today={today}
              index={index}
              busy={busyPlanId === plan.id}
              isTaken={(slot) => logIndex.has(logKey(plan.id, selectedDay, slot))}
              isPending={(slot) => isPending(plan.id, selectedDay, slot)}
              onToggle={(target, slot) => toggle({ planId: target.id, day: selectedDay, slot })}
              onTogglePause={onTogglePause}
              onDelete={onDelete}
            />
          ))}

          <Divider style={styles.divider} />
          <BadDisclaimer variant="compact" />
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  divider: { marginTop: spacing.sm },
  center: { flex: 1, justifyContent: "center" },
});
