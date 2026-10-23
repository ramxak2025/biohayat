import { Linking, StyleSheet, Switch, View } from "react-native";
import { AppText, Button, Card } from "@/components/ui";
import { plural } from "@/lib/format";
import { spacing, useColors } from "@/theme";
import type { RemindersState } from "./use-reminders";

export interface RemindersCardProps { state: RemindersState & { nextAt?: string | null; scheduledUntil?: string | null; error?: string | null } }
function reminderDate(value: string): string { return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
export function RemindersCard({ state }: RemindersCardProps) {
  const colors = useColors();
  const denied = state.permission === "denied";
  const subtitle = denied ? "Система не разрешает уведомления" : !state.enabled ? "Отметки и курсы сохраняются и без уведомлений" : state.scheduled > 0 ? `Запланировано ${state.scheduled} ${plural(state.scheduled, "напоминание", "напоминания", "напоминаний")}` : "Для ближайших дат напоминаний пока нет";
  return <Card>
    <View style={styles.row}>
      <View style={styles.text}><AppText variant="headline">Напоминания</AppText><AppText variant="footnote" color="muted">{subtitle}</AppText></View>
      <Switch value={state.enabled} disabled={state.busy} onValueChange={state.toggle} trackColor={{ true: colors.brand, false: colors.surfaceSunken }} accessibilityLabel="Напоминания о приёме" />
    </View>
    {denied ? <Button title="Открыть настройки устройства" size="sm" variant="ghost" onPress={() => void Linking.openSettings()} /> : null}
    {state.nextAt ? <AppText variant="footnote" color="muted" style={styles.detail}>Ближайшее: {reminderDate(state.nextAt)}</AppText> : null}
    {state.scheduledUntil ? <AppText variant="footnote" color="muted" style={styles.detail}>Расписание на устройстве — до {reminderDate(state.scheduledUntil)}. Открывайте приложение, чтобы продлить его.</AppText> : null}
    {state.error ? <AppText variant="footnote" color="danger" style={styles.detail} accessibilityRole="alert">{state.error}. Сохранённые курсы и отметки остаются в трекере.</AppText> : null}
  </Card>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: spacing.md }, text: { flex: 1, gap: spacing.xs }, detail: { marginTop: spacing.sm } });
