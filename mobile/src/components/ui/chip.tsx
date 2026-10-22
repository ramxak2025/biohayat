/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика/эффекта — штатный и единственный способ анимировать на UI-потоке.
 * Правило React Compiler про них не знает и даёт ложное срабатывание; в рендере
 * `.value` мы не читаем, поэтому компилятору эта мутация не мешает. */
import { useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Duration, Ease, MIN_TAP_SIZE, radii, spacing, Spring, useColors } from "@/theme";

import { AppText } from "./app-text";
import { PressableScale } from "./press-scale";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: SFSymbol;
  count?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Выбираемая пилюля фильтра. Выбор отмечается цветом, пружинным «поп» и хаптикой. */
export function Chip({ label, selected = false, onPress, icon, count, disabled, style }: ChipProps) {
  const colors = useColors();
  const reduced = useReducedMotion();

  const target = selected ? 1 : 0;
  const progress = useSharedValue(target);
  const pop = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(target, { duration: Duration.fast, easing: Ease.power2Out });
    if (reduced) return;
    // «поп» только при включении — выключение должно быть спокойным
    if (target === 1) pop.value = withSequence(withSpring(1.06, Spring.pop), withSpring(1, Spring.press));
  }, [target, reduced, progress, pop]);

  const idle = colors.surface;
  const active = colors.actionFill;
  const idleBorder = colors.line;

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [idle, active]),
    borderColor: interpolateColor(progress.value, [0, 1], [idleBorder, active]),
    transform: [{ scale: pop.value }],
  }));

  const tint = selected ? colors.textOnBrand : colors.text;

  return (
    <PressableScale
      disabled={disabled}
      haptic="none"
      onPress={() => {
        void Haptics.selectionAsync();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
      style={[styles.hit, disabled ? styles.disabled : null, style]}
    >
      <Animated.View style={[styles.chip, containerStyle]}>
        {icon ? <SymbolView name={icon} size={14} tintColor={tint} /> : null}
        <AppText variant="subhead" weight="600" numberOfLines={1} style={{ color: tint }}>
          {label}
        </AppText>
        {count !== undefined ? (
          <AppText variant="caption" weight="700" style={{ color: tint }}>
            {count}
          </AppText>
        ) : null}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hit: { minHeight: MIN_TAP_SIZE, justifyContent: "center" },
  disabled: { opacity: 0.4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 1,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
