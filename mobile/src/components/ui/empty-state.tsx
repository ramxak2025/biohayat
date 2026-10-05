import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { Duration, radii, spacing, useColors } from "@/theme";

import { AppText } from "./app-text";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: SFSymbol;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Компактный вид — для пустой секции внутри экрана, а не для всего экрана. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = "tray",
  title,
  subtitle,
  actionLabel,
  onAction,
  compact,
  style,
}: EmptyStateProps) {
  const colors = useColors();
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(Duration.base)}
      style={[styles.wrap, compact ? styles.compact : null, style]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.brandSoft }]}>
        <SymbolView name={icon} size={compact ? 24 : 30} tintColor={colors.brand} weight="regular" />
      </View>

      <AppText variant={compact ? "headline" : "title3"} align="center" style={styles.title}>
        {title}
      </AppText>

      {subtitle ? (
        <AppText variant="subhead" color="muted" align="center" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}

      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" size="md" style={styles.action} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: spacing["3xl"], paddingHorizontal: spacing.lg },
  compact: { paddingVertical: spacing.xl },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.base,
  },
  title: { marginBottom: spacing.xs },
  subtitle: { maxWidth: 300 },
  action: { marginTop: spacing.lg },
});
