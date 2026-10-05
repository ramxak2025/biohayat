import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle, labelsHidden } from "@expo/ui/swift-ui/modifiers";

import { AppText, Button } from "@/components/ui";
import { radii, spacing, useColors, useTheme } from "@/theme";

import { slotFromDate, slotToDate } from "./plan-utils";

export interface TimePickerSheetProps {
  visible: boolean;
  /** Время "HH:MM", с которого открывается барабан. */
  initial: string;
  title?: string;
  onCancel: () => void;
  onSubmit: (time: string) => void;
}

/** Нативный барабан времени (SwiftUI DatePicker) в нижнем листе. */
export function TimePickerSheet({
  visible,
  initial,
  title = "Время приёма",
  onCancel,
  onSubmit,
}: TimePickerSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable
        style={styles.scrim}
        accessibilityLabel="Закрыть выбор времени"
        accessibilityRole="button"
        onPress={onCancel}
      >
        <View style={[styles.scrimFill, { backgroundColor: colors.scrim }]} />
      </Pressable>

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.line,
            paddingBottom: insets.bottom + spacing.base,
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.line }]} />

        <AppText variant="headline" align="center" style={styles.title}>
          {title}
        </AppText>

        {/* key по initial: барабан всегда открывается на том времени, которое правим */}
        {visible ? (
          <PickerBody key={initial} initial={initial} onCancel={onCancel} onSubmit={onSubmit} />
        ) : null}
      </View>
    </Modal>
  );
}

interface PickerBodyProps {
  initial: string;
  onCancel: () => void;
  onSubmit: (time: string) => void;
}

function PickerBody({ initial, onCancel, onSubmit }: PickerBodyProps) {
  const colors = useColors();
  const theme = useTheme();
  const [date, setDate] = useState(() => slotToDate(initial));

  return (
    <>
      <Host style={styles.host} colorScheme={theme.dark ? "dark" : "light"} seedColor={colors.brand}>
        <DatePicker
          displayedComponents={["hourAndMinute"]}
          selection={date}
          onDateChange={setDate}
          modifiers={[datePickerStyle("wheel"), labelsHidden()]}
        />
      </Host>

      <View style={styles.actions}>
        <Button title="Отмена" variant="ghost" size="md" onPress={onCancel} style={styles.action} />
        <Button
          title="Готово"
          size="md"
          onPress={() => onSubmit(slotFromDate(date))}
          style={styles.action}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scrimFill: { flex: 1 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  grabber: { alignSelf: "center", width: 36, height: 5, borderRadius: radii.pill },
  title: { marginTop: spacing.md },
  host: { height: 196, marginTop: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  action: { flex: 1 },
});
