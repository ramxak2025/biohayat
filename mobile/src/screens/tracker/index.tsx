import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTracker } from "@/tracker/provider";
import { useTrackerClock } from "@/tracker/clock";
import type { TrackerController } from "@/tracker/types";
import { AppText, Button, Card, Divider, IconButton, Screen } from "@/components/ui";
import { DaySummary } from "@/components/tracker/day-summary";
import { IntakeRow } from "@/components/tracker/intake-row";
import { TrackerState, TrackerConflicts } from "@/components/tracker/tracker-state";
import { TrackerSkeleton } from "@/components/tracker/tracker-skeleton";
import { RemindersCard } from "@/components/tracker/reminders-card";
import { useIntakeReminders } from "@/components/tracker/use-reminders";
import { nextTrackerDay, recentTrackerDays, selectedDayRows, trackerDate, type IntakeRowData } from "@/components/tracker/presentation";
import { spacing } from "@/theme";

export function TrackerScreen() {
  const tracker: TrackerController & { partitionKey: string } = useTracker();
  return <TrackerBody key={tracker.partitionKey} tracker={tracker} />;
}
export function TrackerBody({ tracker }: { tracker: TrackerController }) {
  const router = useRouter();
  const { today } = useTrackerClock();
  const [day, setDay] = useState(today);
  const previousToday = useRef(today);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const reminders = useIntakeReminders(tracker.plans, tracker.hydrated && !tracker.storageError);
  useEffect(() => {
    if (day === previousToday.current) setDay(today);
    previousToday.current = today;
  }, [today, day]);
  const refresh = async () => {
    setRefreshing(true); setRefreshError(null);
    try { await (tracker.access === "account" ? tracker.sync() : tracker.reload()); }
    catch (error) { setRefreshError(error instanceof Error ? error.message : "Не удалось обновить трекер"); }
    finally { setRefreshing(false); }
  };
  const add = () => router.push("/tracker/new");
  const header = <Stack.Screen options={{ title: "Приём", headerRight: () => <IconButton name={{ ios: "plus", android: "add", web: "add" }} label="Добавить курс" disabled={!tracker.hydrated || !!tracker.storageError} onPress={add} /> }} />;
  if (!tracker.hydrated) return <>{header}<Screen scroll contentContainerStyle={styles.content}><TrackerState tracker={tracker} />{!tracker.storageError ? <TrackerSkeleton /> : null}</Screen></>;
  const known = tracker.isDayKnown(day);
  const rows = selectedDayRows(tracker.plans, tracker.logs, day, today);
  const scheduled = rows.filter((row) => row.scheduled);
  const groups = new Map<string, IntakeRowData[]>();
  for (const row of rows) groups.set(row.slot, [...(groups.get(row.slot) ?? []), row]);
  const next = nextTrackerDay(tracker.plans, today);
  const emptyKnown = known && tracker.plansKnown;
  return <>{header}<Screen scroll refreshing={refreshing} onRefresh={() => void refresh()} contentContainerStyle={styles.content}>
    <TrackerState tracker={tracker} />
    <DaySummary day={day} today={today} known={known && (day !== today || tracker.plansKnown)} planned={scheduled.length} taken={scheduled.filter((row) => row.taken).length} recorded={rows.filter((row) => row.taken).length} days={recentTrackerDays(today)} onSelectDay={setDay} />
    <TrackerConflicts tracker={tracker} />
    {!tracker.plansKnown ? <Card tone="soft"><AppText variant="subhead" color="muted">Список курсов загружен не полностью. Сохранённые на телефоне данные доступны.</AppText><Button title="Обновить список" size="sm" variant="ghost" onPress={() => void refresh()} /></Card> : null}
    {!known ? <View style={styles.notice}><AppText variant="subhead" color="muted">История за этот день пока неизвестна. Это не означает, что приёмов не было.</AppText>{tracker.access === "account" ? <Button title="Обновить историю" size="sm" variant="ghost" disabled={!tracker.online} onPress={() => void refresh()} /> : null}</View> : null}
    {rows.length === 0 && emptyKnown ? <Card tone="soft">
      <AppText variant="headline">{day !== today ? "Нет сохранённых отметок" : tracker.plans.length === 0 ? "Добавьте первый курс" : "Сегодня свободный день"}</AppText>
      <AppText variant="subhead" color="muted" style={styles.copy}>{day !== today ? "Здесь показываются только реальные отметки. Прошлые пропуски по текущему расписанию не рассчитываются." : tracker.plans.length === 0 ? "Укажите название, дни и время приёма. Курс можно сохранить без сети." : next ? `Ближайший приём — ${trackerDate(next, true)}.` : "Активных приёмов нет. Можно возобновить курс или добавить новый."}</AppText>
      {day === today && tracker.plans.length === 0 ? <Button title="Добавить курс" onPress={add} disabled={!!tracker.storageError} /> : null}
    </Card> : null}
    {[...groups].map(([slot, items]) => <Card key={slot}>
      <AppText variant="title3" accessibilityRole="header">{slot}</AppText>
      {items.map((row, index) => <View key={row.key}>{index > 0 ? <Divider /> : null}<IntakeRow row={row} tracker={tracker} known={known} /></View>)}
    </Card>)}
    <Button title="Мои курсы" variant="secondary" fullWidth onPress={() => router.push("/tracker/courses")} />
    <RemindersCard state={reminders} />
    {refreshError ? <AppText variant="footnote" color="danger" accessibilityRole="alert">{refreshError}</AppText> : null}
  </Screen></>;
}
const styles = StyleSheet.create({ content: { gap: spacing.base, paddingTop: spacing.md }, copy: { marginVertical: spacing.md }, notice: { gap: spacing.xs } });
