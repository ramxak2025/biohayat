import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from "react-native";

import { typography, useColors } from "@/theme";
import { appFont } from "@/theme/fonts";
import { typesetTextChildren } from "@/lib/russian-typesetting";

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
  hero: 1.3,
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
  children,
  ...rest
}: AppTextProps) {
  const colors = useColors();
  const { fontWeight, ...variantStyle } = typography[variant];
  const font = appFont(
    StyleSheet.flatten(style)?.fontWeight ?? weight ?? fontWeight,
    variant === "hero" || variant === "largeTitle" || variant === "title1" || variant === "title2" || variant === "title3",
  );

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
      lineBreakStrategyIOS="standard"
      textBreakStrategy="highQuality"
      maxFontSizeMultiplier={maxScale ?? MAX_SCALE[variant] ?? DEFAULT_MAX_SCALE}
      style={[
        variantStyle,
        { color: tone[color] },
        { fontWeight: weight ?? fontWeight },
        align ? { textAlign: align } : null,
        style,
        font ? { fontFamily: font, fontWeight: "normal" } : null,
      ]}
      {...rest}
    >
      {typesetTextChildren(children)}
    </Text>
  );
}
