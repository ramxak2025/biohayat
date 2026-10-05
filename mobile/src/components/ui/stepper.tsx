import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";

import { MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

import { AppText } from "./app-text";
import { PressableScale } from "./press-scale";

const TAP_SIZE = Platform.OS === "android" ? 48 : MIN_TAP_SIZE;

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  disabled?: boolean;
  /** Если задан — на минимуме «−» превращается в удаление строки. */
  onRemove?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Количество товара. −/+ с хаптикой выбора; зона нажатия 44 pt даже у маленького варианта. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  disabled,
  onRemove,
  style,
}: StepperProps) {
  const colors = useColors();
  const compact = size === "sm";
  const glyph = compact ? 14 : 16;

  const atMin = value <= min;
  const removeMode = atMin && !!onRemove;

  const step = (delta: number) => {
    if (delta < 0 && removeMode) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRemove?.();
      return;
    }
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    void Haptics.selectionAsync();
    onChange(next);
  };

  return (
    <View
      style={[styles.row, compact ? styles.rowSm : styles.rowMd, { backgroundColor: colors.brandSoft }, style]}
    >
      <PressableScale
        onPress={() => step(-1)}
        disabled={disabled || (atMin && !onRemove)}
        haptic="none"
        accessibilityRole="button"
        accessibilityLabel={removeMode ? "Удалить из корзины" : "Уменьшить количество"}
        style={styles.button}
      >
        <SymbolView
          name={removeMode ? "trash" : "minus"}
          size={glyph}
          weight="semibold"
          tintColor={disabled || (atMin && !onRemove) ? colors.textFaint : removeMode ? colors.danger : colors.brand}
        />
      </PressableScale>

      <AppText
        variant={compact ? "subhead" : "callout"}
        weight="700"
        align="center"
        maxScale={1.4}
        accessibilityLabel={`Количество: ${value}`}
        style={styles.value}
      >
        {value}
      </AppText>

      <PressableScale
        onPress={() => step(1)}
        disabled={disabled || value >= max}
        haptic="none"
        accessibilityRole="button"
        accessibilityLabel="Увеличить количество"
        style={styles.button}
      >
        <SymbolView
          name="plus"
          size={glyph}
          weight="semibold"
          tintColor={disabled || value >= max ? colors.textFaint : colors.brand}
        />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", borderRadius: radii.pill, alignSelf: "flex-start" },
  rowMd: { minHeight: TAP_SIZE, paddingHorizontal: spacing.xs },
  rowSm: { minHeight: TAP_SIZE, paddingHorizontal: 2 },
  button: { width: TAP_SIZE, minHeight: TAP_SIZE, alignItems: "center", justifyContent: "center" },
  value: { minWidth: 28, paddingHorizontal: spacing.xs },
});
