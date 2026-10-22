import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";

import { MIN_TAP_SIZE, radii, useColors } from "@/theme";

import { GlassSurface } from "./glass-surface";
import { PressableScale, type PressHaptic } from "./press-scale";

export type IconButtonVariant = "plain" | "soft" | "filled" | "glass";

export interface IconButtonProps {
  name: SymbolViewProps["name"];
  /** Обязателен: VoiceOver не видит иконку (HIG: «always specify an accessibility label»). */
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Размер глифа, не кнопки. Зона нажатия всегда >= 44 pt. */
  size?: number;
  variant?: IconButtonVariant;
  color?: string;
  disabled?: boolean;
  selected?: boolean;
  haptic?: PressHaptic;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  name,
  label,
  onPress,
  onLongPress,
  size = 20,
  variant = "plain",
  color,
  disabled,
  selected,
  haptic = "light",
  style,
}: IconButtonProps) {
  const colors = useColors();

  const tint = color ?? (variant === "filled" ? colors.textOnBrand : colors.text);
  const background =
    variant === "soft" ? colors.surfaceSunken : variant === "filled" ? colors.brand : "transparent";

  const glyph = (
    <SymbolView name={name} size={size} tintColor={tint} weight="medium" resizeMode="scaleAspectFit" />
  );

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected }}
      style={[styles.hit, disabled ? styles.disabled : null, style]}
    >
      {variant === "glass" ? (
        <GlassSurface style={styles.round}>{glyph}</GlassSurface>
      ) : (
        <View style={[styles.round, { backgroundColor: background }]}>{glyph}</View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: MIN_TAP_SIZE,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  round: {
    width: MIN_TAP_SIZE - 8,
    height: MIN_TAP_SIZE - 8,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.35 },
});
