import { useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import type { TrackerController } from "@/tracker/types";
import { AppText } from "@/components/ui";
import { spacing } from "@/theme";
import { SlotChip } from "./slot-chip";
import type { IntakeRowData } from "./presentation";

export function IntakeRow({ row, tracker, known }: { row: IntakeRowData; tracker: TrackerController; known: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const save = async (taken: boolean) => {
    if (running.current) return;
    running.current = true; setPending(true); setError(null);
    try { await tracker.setTaken(row.planId, row.day, row.slot, taken); void Haptics.selectionAsync(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Отметка не сохранена. Попробуйте ещё раз."); }
    finally { running.current = false; setPending(false); }
  };
  return <View style={styles.row}>
    <AppText variant="headline">{row.title}</AppText>
    {row.note ? <AppText variant="subhead" color="muted">{row.note}</AppText> : null}
    {!row.scheduled ? <AppText variant="footnote" color="muted">Сохранённая отметка</AppText> : null}
    {!known && !row.taken ? <AppText variant="footnote" color="muted">История загружена не полностью. Можно сохранить отметку на телефоне.</AppText> : null}
    <SlotChip time={row.slot} taken={row.taken} pending={pending} disabled={!!tracker.storageError} unknown={!known} onPress={() => {
      if (row.taken && !row.scheduled) Alert.alert("Снять сохранённую отметку?", row.title, [{ text: "Отмена", style: "cancel" }, { text: "Снять", onPress: () => void save(false) }]);
      else void save(row.taken ? false : true);
    }} />
    {error ? <AppText variant="footnote" color="danger" accessibilityRole="alert">{error}</AppText> : null}
  </View>;
}
const styles = StyleSheet.create({ row: { gap: spacing.sm, paddingVertical: spacing.md } });
