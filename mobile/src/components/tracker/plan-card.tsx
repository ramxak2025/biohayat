import { useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { TrackerPlan, TrackerSyncState } from "@/tracker/types";
import { AppText, Button, Card, PressableScale } from "@/components/ui";
import { spacing } from "@/theme";
import { cadenceLabel, courseStatus, syncStateLabel, trackerDate } from "./presentation";

export interface PlanCardProps { plan: TrackerPlan; today: string; syncState: TrackerSyncState; onEdit: () => void; onTogglePause: () => Promise<void>; onDelete: () => Promise<void> }
export function PlanCard({ plan, today, syncState, onEdit, onTogglePause, onDelete }: PlanCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const running = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Изменение не сохранено"); }
    finally { running.current = false; setBusy(false); }
  };
  return <Card>
    <View style={styles.stack}>
      <AppText variant="headline">{plan.title}</AppText>
      <AppText variant="subhead" color="muted">{cadenceLabel(plan.intervalDays)} · {plan.times.join(", ")}</AppText>
      <AppText variant="footnote" color="muted">С {trackerDate(plan.anchorDay, true)} · {courseStatus(plan, today)}</AppText>
      <AppText variant="footnote" color={syncState === "conflict" ? "danger" : "faint"}>{syncStateLabel[syncState]}</AppText>
      {plan.note ? <View><PressableScale onPress={() => setNoteOpen(!noteOpen)} haptic="none" accessibilityRole="button" accessibilityState={{ expanded: noteOpen }} style={styles.noteControl}><AppText variant="footnote">{noteOpen ? "Скрыть заметку" : "Заметка"}</AppText></PressableScale>{noteOpen ? <AppText variant="subhead" color="muted">{plan.note}</AppText> : null}</View> : null}
      <Button title="Изменить курс" variant="secondary" fullWidth onPress={onEdit} disabled={busy} />
      <View style={styles.actions}>
        <Button title={plan.isActive ? "Пауза" : "Возобновить"} variant="ghost" size="sm" loading={busy} onPress={() => void run(onTogglePause)} />
        <Button title="Удалить" variant="ghost" size="sm" disabled={busy} onPress={() => Alert.alert("Удалить курс?", plan.title, [{ text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: () => void run(onDelete) }])} />
      </View>
      {error ? <AppText variant="footnote" color="danger" accessibilityRole="alert">{error}</AppText> : null}
    </View>
  </Card>;
}
const styles = StyleSheet.create({ stack: { gap: spacing.sm }, actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm }, noteControl: { minHeight: 48, justifyContent: "center" } });
