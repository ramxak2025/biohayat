import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from "react-native-reanimated";

import { AppText, Divider, IconButton, PressableScale } from "@/components/ui";
import { Duration, MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

import { SLOT_PERIOD_ICON, SLOT_PERIOD_LABEL, slotPeriod } from "./plan-utils";

export interface TimeListProps {
  times: readonly string[];
  onEdit: (time: string) => void;
  onRemove: (time: string) => void;
  onAdd: () => void;
  /** Достигнут предел количества времён — кнопку «Добавить» гасим. */
  addDisabled?: boolean;
  disabled?: boolean;
}

/** Список времён приёма: тап по строке — изменить, крестик — убрать. */
export function TimeList({ times, onEdit, onRemove, onAdd, addDisabled, disabled }: TimeListProps) {
  const colors = useColors();
  const reduced = useReducedMotion();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {times.map((time, index) => {
        const period = slotPeriod(time);
        return (
          <Animated.View
            key={time}
            layout={reduced ? undefined : LinearTransition.duration(Duration.base)}
            entering={reduced ? undefined : FadeIn.duration(Duration.fast)}
            exiting={reduced ? undefined : FadeOut.duration(Duration.instant)}
          >
            {index > 0 ? <Divider inset={spacing.base} /> : null}
            <View style={styles.row}>
              <PressableScale
                onPress={() => onEdit(time)}
                disabled={disabled}
                haptic="none"
                accessibilityRole="button"
                accessibilityLabel={`Время приёма ${time}`}
                accessibilityHint="Дважды коснитесь, чтобы изменить"
                style={styles.rowMain}
              >
                <View style={[styles.icon, { backgroundColor: colors.surfaceSunken }]}>
                  <SymbolView name={{ ios: SLOT_PERIOD_ICON[period], android: "schedule", web: "schedule" }} size={15} tintColor={colors.brand} />
                </View>
                <AppText variant="headline" weight="600">
                  {time}
                </AppText>
                <AppText variant="footnote" color="faint">
                  {SLOT_PERIOD_LABEL[period]}
                </AppText>
              </PressableScale>

              <IconButton
                name={{ ios: "xmark", android: "close", web: "close" }}
                label={`Убрать время ${time}`}
                size={14}
                variant="soft"
                onPress={() => onRemove(time)}
                disabled={disabled}
              />
            </View>
          </Animated.View>
        );
      })}

      {times.length > 0 ? <Divider inset={spacing.base} /> : null}

      <PressableScale
        onPress={onAdd}
        disabled={disabled || addDisabled}
        accessibilityRole="button"
        accessibilityLabel="Добавить время приёма"
        style={[styles.add, addDisabled ? styles.disabled : null]}
      >
        <SymbolView name={{ ios: "plus.circle.fill", android: "add_circle", web: "add_circle" }} size={20} tintColor={colors.brandText} />
        <AppText variant="callout" style={{ color: colors.brandText }} weight="600">
          Добавить время
        </AppText>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: spacing.md,
    minHeight: MIN_TAP_SIZE + 8,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.base,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  add: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: MIN_TAP_SIZE + 4,
    paddingHorizontal: spacing.base,
  },
  disabled: { opacity: 0.4 },
});
