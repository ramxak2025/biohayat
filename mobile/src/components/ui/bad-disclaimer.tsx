import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { SymbolView } from "expo-symbols";

import { useBadDisclaimer } from "@/hooks/use-settings";
import { radii, spacing, useColors } from "@/theme";

import { AppText } from "./app-text";

export interface BadDisclaimerProps {
  /** compact — одна строка мелким под ценой; full — плашка с иконкой. */
  variant?: "compact" | "full";
  style?: StyleProp<ViewStyle>;
}

/**
 * Обязательная плашка про БАД. Требование к обороту БАД в РФ: показывать в
 * каталоге, в карточке товара и в оформлении заказа. Текст приходит из настроек
 * магазина — не хардкодить его на экранах.
 */
export function BadDisclaimer({ variant = "full", style }: BadDisclaimerProps) {
  const colors = useColors();
  const text = useBadDisclaimer();

  if (variant === "compact") {
    return (
      <AppText
        variant="caption"
        color="faint"
        // style объявлен как ViewStyle (основной вариант — View); для текстового
        // варианта берём из него только общие с TextStyle свойства
        style={[styles.compact, style as StyleProp<TextStyle>]}
        accessibilityRole="text"
      >
        {text}
      </AppText>
    );
  }

  return (
    <View
      accessibilityRole="text"
      style={[styles.box, { backgroundColor: colors.accentSoft, borderColor: colors.accent }, style]}
    >
      <SymbolView name="info.circle.fill" size={16} tintColor={colors.accent} style={styles.icon} />
      <AppText variant="footnote" style={[styles.text, { color: colors.accent }]}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { lineHeight: 16 },
  box: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { marginTop: 1 },
  text: { flex: 1 },
});
