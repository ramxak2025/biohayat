import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";

import { MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

import { AppText, type TextVariant } from "./app-text";
import { PressableScale, type PressHaptic } from "./press-scale";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  /** SF Symbol строкой либо готовый узел. */
  leftIcon?: SFSymbol | ReactNode;
  rightIcon?: SFSymbol | ReactNode;
  fullWidth?: boolean;
  haptic?: PressHaptic;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 48, lg: 56 };
const PAD: Record<ButtonSize, number> = { sm: spacing.base, md: spacing.lg, lg: spacing.xl + 4 };
const VERTICAL_PAD: Record<ButtonSize, number> = { sm: spacing.sm, md: spacing.md, lg: spacing.base };
const TEXT: Record<ButtonSize, TextVariant> = { sm: "subhead", md: "callout", lg: "headline" };
const ICON: Record<ButtonSize, number> = { sm: 15, md: 17, lg: 19 };

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth,
  haptic = "light",
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const colors = useColors();
  const inactive = disabled || loading;

  const surface: Record<ButtonVariant, string> = {
    primary: colors.actionFill,
    secondary: colors.brandSoft,
    outline: "transparent",
    ghost: "transparent",
    danger: colors.danger,
  };
  const label: Record<ButtonVariant, string> = {
    primary: colors.textOnBrand,
    secondary: colors.brandText,
    outline: colors.text,
    ghost: colors.brandText,
    danger: colors.textOnBrand,
  };
  const outlineColor: Record<ButtonVariant, string | undefined> = {
    primary: undefined,
    secondary: undefined,
    outline: colors.line,
    ghost: undefined,
    danger: undefined,
  };

  const foreground = label[variant];

  // ReactNode включает string, поэтому сужение по typeof даёт просто string — отсюда приведение
  const renderIcon = (icon: SFSymbol | ReactNode) =>
    typeof icon === "string" ? (
      <SymbolView name={icon as SFSymbol} size={ICON[size]} tintColor={foreground} weight="semibold" />
    ) : (
      icon
    );

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      haptic={inactive ? "none" : haptic}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        {
          minHeight: Math.max(HEIGHT[size], Platform.OS === "android" ? 48 : MIN_TAP_SIZE),
          paddingHorizontal: PAD[size],
          paddingVertical: VERTICAL_PAD[size],
          backgroundColor: surface[variant],
        },
        outlineColor[variant]
          ? { borderWidth: StyleSheet.hairlineWidth, borderColor: outlineColor[variant] }
          : null,
        fullWidth ? styles.fullWidth : null,
        inactive ? styles.inactive : null,
        style,
      ]}
    >
      <View style={[styles.content, loading ? styles.hidden : null]}>
        {leftIcon ? renderIcon(leftIcon) : null}
        <AppText variant={TEXT[size]} weight="600" maxScale={1.5} style={[styles.label, { color: foreground }]}>
          {title}
        </AppText>
        {rightIcon ? renderIcon(rightIcon) : null}
      </View>
      {loading ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ActivityIndicator color={foreground} style={styles.spinner} />
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
    flexShrink: 1,
    borderRadius: radii.pill,
  },
  fullWidth: { alignSelf: "stretch", width: "100%" },
  inactive: { opacity: 0.45 },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minWidth: 0, maxWidth: "100%" },
  label: { flexShrink: 1, textAlign: "center" },
  // прячем подпись, а не убираем: иначе кнопка «прыгает» по ширине на время загрузки
  hidden: { opacity: 0 },
  spinner: { flex: 1 },
});
