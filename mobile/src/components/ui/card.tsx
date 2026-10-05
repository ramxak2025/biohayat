import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radii, shadows, spacing, useColors } from "@/theme";

import { PressableScale } from "./press-scale";

export type CardTone = "surface" | "soft" | "brand" | "accent" | "sunken";

export interface CardProps {
  children?: ReactNode;
  /** true — padding spacing.base; число — свой padding; false — без внутренних отступов. */
  padded?: boolean | number;
  tone?: CardTone;
  bordered?: boolean;
  elevated?: boolean;
  radius?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  padded = true,
  tone = "surface",
  bordered = true,
  elevated = true,
  radius = radii["2xl"],
  onPress,
  accessibilityLabel,
  style,
}: CardProps) {
  const colors = useColors();

  const background: Record<CardTone, string> = {
    surface: colors.surface,
    soft: colors.surfaceSoft,
    sunken: colors.surfaceSunken,
    brand: colors.brandSoft,
    accent: colors.accentSoft,
  };
  const border: Record<CardTone, string> = {
    surface: colors.line,
    soft: colors.line,
    sunken: colors.line,
    brand: colors.brandBorder,
    accent: colors.accent,
  };

  const cardStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: background[tone],
      borderRadius: radius,
      padding: padded === true ? spacing.base : padded === false ? 0 : padded,
    },
    bordered ? { borderWidth: StyleSheet.hairlineWidth, borderColor: border[tone] } : null,
    elevated ? shadows.sm : null,
    style,
  ];

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={cardStyle}
      >
        {children}
      </PressableScale>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}
