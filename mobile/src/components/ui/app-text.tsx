import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from "react-native";

import { typography, useColors } from "@/theme";

export type TextVariant = keyof typeof typography;

export type TextTone =
  | "text"
  | "muted"
  | "faint"
  | "brand"
  | "danger"
  | "onBrand"
  | "accent"
  | "success"
  | "warning";

export interface AppTextProps extends Omit<TextProps, "style"> {
  variant?: TextVariant;
  color?: TextTone;
  /** Точечная замена насыщенности, когда варианта мало (цена, акцент в строке). */
  weight?: TextStyle["fontWeight"];
  align?: TextStyle["textAlign"];
  /** Предел масштабирования Dynamic Type. По умолчанию зависит от варианта. */
  maxScale?: number;
  style?: StyleProp<TextStyle>;
}

/** Крупные заголовки ломают вёрстку раньше мелкого текста — потолок им ниже. */
const MAX_SCALE: Partial<Record<TextVariant, number>> = {
  largeTitle: 1.35,
  title1: 1.4,
  title2: 1.5,
  title3: 1.5,
  headline: 1.6,
};
const DEFAULT_MAX_SCALE = 1.9;

export function AppText({
  variant = "body",
  color = "text",
  weight,
  align,
  maxScale,
  style,
  ...rest
}: AppTextProps) {
  const colors = useColors();

  const tone: Record<TextTone, string> = {
    text: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    brand: colors.brand,
    danger: colors.danger,
    onBrand: colors.textOnBrand,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
  };

  return (
    <Text
      maxFontSizeMultiplier={maxScale ?? MAX_SCALE[variant] ?? DEFAULT_MAX_SCALE}
      style={[
        styles[variant],
        { color: tone[color] },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  largeTitle: typography.largeTitle,
  title1: typography.title1,
  title2: typography.title2,
  title3: typography.title3,
  headline: typography.headline,
  body: typography.body,
  callout: typography.callout,
  subhead: typography.subhead,
  footnote: typography.footnote,
  caption: typography.caption,
  caption2: typography.caption2,
});
