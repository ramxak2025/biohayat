import { ScrollView, StyleSheet } from "react-native";
import { AppText, PressableScale } from "@/components/ui";
import { radii, spacing, useColors } from "@/theme";
import { trackerDate } from "./presentation";

export interface WeekStripProps { days: readonly string[]; selected: string; today: string; onSelect: (day: string) => void }
export function WeekStrip({ days, selected, today, onSelect }: WeekStripProps) {
  const colors = useColors();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
    {days.map((day) => <PressableScale key={day} onPress={() => onSelect(day)} haptic="none" scale={0.99}
      accessibilityRole="tab" accessibilityState={{ selected: day === selected }} accessibilityLabel={`${day === today ? "Сегодня, " : ""}${trackerDate(day, true)}`}
      style={[styles.day, { backgroundColor: day === selected ? colors.brandSoft : colors.surface, borderColor: day === selected ? colors.brandBorder : colors.line }]}>
      <AppText variant="caption" color="muted">{new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}</AppText>
      <AppText variant="headline" style={{ color: day === selected ? colors.brandText : colors.text }}>{Number(day.slice(8))}</AppText>
    </PressableScale>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ row: { gap: spacing.xs, paddingVertical: spacing.xs }, day: { minWidth: 48, minHeight: 64, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, alignItems: "center", justifyContent: "center", gap: spacing.xs, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md } });
