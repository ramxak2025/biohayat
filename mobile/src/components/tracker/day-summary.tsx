import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { plural } from "@/lib/format";
import { radii, spacing, useColors } from "@/theme";
import { trackerDate } from "./presentation";
import { WeekStrip } from "./week-strip";

export interface DaySummaryProps { day: string; today: string; known: boolean; planned: number; taken: number; recorded: number; days: readonly string[]; onSelectDay: (day: string) => void }
export function DaySummary({ day, today, known, planned, taken, recorded, days, onSelectDay }: DaySummaryProps) {
  const colors = useColors();
  const isToday = day === today;
  const label = !known ? "История за этот день загружена не полностью" : isToday && planned > 0 ? `По расписанию отмечено ${taken} из ${planned}` : isToday ? "Сегодня приёмов по расписанию нет" : `Сохранено ${recorded} ${plural(recorded, "отметка", "отметки", "отметок")}`;
  return <View style={styles.wrap}>
    <View style={styles.heading}>
      <AppText variant="title3" accessibilityRole="header">{isToday ? "Сегодня" : trackerDate(day, true)}</AppText>
      {isToday ? <AppText variant="subhead" color="muted">{trackerDate(day, true)}</AppText> : null}
      <AppText variant="subhead" color="muted" accessibilityLiveRegion="polite">{label}</AppText>
    </View>
    {known && isToday && planned > 0 ? <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: planned, now: taken }}>
      <View style={[styles.fill, { backgroundColor: colors.actionFill, width: `${Math.min(1, taken / planned) * 100}%` }]} />
    </View> : null}
    <WeekStrip days={days} selected={day} today={today} onSelect={onSelectDay} />
  </View>;
}
const styles = StyleSheet.create({ wrap: { gap: spacing.md }, heading: { gap: spacing.xs }, track: { height: 5, borderRadius: radii.pill, overflow: "hidden" }, fill: { height: "100%", borderRadius: radii.pill } });
