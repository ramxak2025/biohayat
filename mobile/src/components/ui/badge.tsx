import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";

import { radii, spacing, useColors } from "@/theme";

import { AppText } from "./app-text";

export type BadgeTone = "brand" | "sale" | "accent" | "neutral" | "success" | "danger";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Сплошная заливка вместо мягкой — для скидки «−25 %» и прочих акцентов. */
  solid?: boolean;
  icon?: SFSymbol;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = "neutral", size = "md", solid, icon, style }: BadgeProps) {
  const colors = useColors();

  const base: Record<BadgeTone, string> = {
    brand: colors.brand,
    sale: colors.sale,
    accent: colors.accent,
    neutral: colors.textMuted,
    success: colors.success,
    danger: colors.danger,
  };
  const soft: Record<BadgeTone, string> = {
    brand: colors.brandSoft,
    sale: colors.surfaceSunken,
    accent: colors.accentSoft,
    neutral: colors.surfaceSunken,
    success: colors.brandSoft,
    danger: colors.surfaceSunken,
  };

  const background = solid ? base[tone] : soft[tone];
  const foreground = solid ? colors.textOnBrand : base[tone];

  return (
    <View
      style={[
        styles.base,
        size === "sm" ? styles.sm : styles.md,
        { backgroundColor: background },
        style,
      ]}
    >
      {icon ? <SymbolView name={icon} size={size === "sm" ? 10 : 12} tintColor={foreground} /> : null}
      <AppText
        variant={size === "sm" ? "caption2" : "caption"}
        weight="700"
        numberOfLines={1}
        maxScale={1.3}
        style={{ color: foreground }}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    borderRadius: radii.pill,
  },
  sm: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
  md: { paddingHorizontal: spacing.md - 2, paddingVertical: spacing.xs },
});
