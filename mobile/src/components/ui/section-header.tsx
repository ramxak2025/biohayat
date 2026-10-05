import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView } from "expo-symbols";

import { HIT_SLOP, MIN_TAP_SIZE, spacing, useColors } from "@/theme";

import { AppText } from "./app-text";
import { PressableScale } from "./press-scale";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Подпись действия справа. По умолчанию «Все», если передан onAction. */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Заголовок секции. Регистр — обычный, без CAPS: iOS 26 перешёл на
 * title-style capitalization, а русские заголовки капсом читаются как веб.
 */
export function SectionHeader({ title, subtitle, actionLabel, onAction, style }: SectionHeaderProps) {
  const colors = useColors();
  const label = actionLabel ?? "Все";

  return (
    <View style={[styles.row, style]}>
      <View style={styles.titles}>
        <AppText variant="title3">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" color="muted" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {onAction ? (
        <PressableScale
          onPress={onAction}
          haptic="none"
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${title}`}
          style={styles.action}
        >
          <AppText variant="subhead" color="brand" weight="600" style={styles.actionLabel}>
            {label}
          </AppText>
          <SymbolView name="chevron.right" size={12} tintColor={colors.brand} weight="semibold" />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: MIN_TAP_SIZE,
    marginBottom: spacing.md,
  },
  titles: { flex: 1, minWidth: 0 },
  subtitle: { marginTop: 2 },
  action: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingLeft: spacing.sm, minHeight: MIN_TAP_SIZE, flexShrink: 1, maxWidth: "45%" },
  actionLabel: { flexShrink: 1, textAlign: "right" },
});
