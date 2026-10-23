import { useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { SheetHeader } from "@/components/ui/sheet-header";
import { spacing, useColors, useTheme } from "@/theme";
import { isCalendarDay, isSlot } from "@/tracker/calendar";

/** Picker adapters only: civil-day arithmetic remains in the shared calendar. */
export function pickerDate(value: string, mode: "date" | "time"): Date {
  if (mode === "date" && isCalendarDay(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
  }
  const [hour, minute] = (isSlot(value) ? value : "09:00").split(":").map(Number);
  return new Date(2020, 0, 15, hour, minute);
}
export function pickerValue(date: Date, mode: "date" | "time"): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return mode === "date" ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function SchedulePicker({ mode, value, onCancel, onSubmit }: { mode: "date" | "time"; value: string; onCancel: () => void; onSubmit: (value: string) => void }) {
  const colors = useColors();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [candidate, setCandidate] = useState(() => pickerDate(value, mode));
  const picker = <DateTimePicker mode={mode} value={candidate} display={mode === "date" ? "inline" : "spinner"} is24Hour locale="ru_RU" themeVariant={theme.dark ? "dark" : "light"} accentColor={colors.brand}
    minimumDate={mode === "date" ? new Date(1900, 0, 1) : undefined} maximumDate={mode === "date" ? new Date(2199, 11, 31, 23, 59) : undefined}
    positiveButton={{ label: "Готово" }} negativeButton={{ label: "Отмена" }} onDismiss={onCancel}
    onValueChange={(_event, date) => { if (Platform.OS === "android") onSubmit(pickerValue(date, mode)); else setCandidate(date); }} />;
  if (Platform.OS === "android") return picker;
  return <Modal visible animationType="slide" presentationStyle="pageSheet" allowSwipeDismissal onRequestClose={onCancel} onDismiss={onCancel}>
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <SheetHeader title={mode === "date" ? "Первый день приёма" : "Время приёма"} onClose={onCancel} />
      <ScrollView contentContainerStyle={styles.body}>{picker}</ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}><Button title="Готово" fullWidth onPress={() => onSubmit(pickerValue(candidate, mode))} /></View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, body: { padding: spacing.base }, footer: { padding: spacing.base } });
