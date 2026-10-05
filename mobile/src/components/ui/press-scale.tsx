/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика/эффекта — штатный и единственный способ анимировать на UI-потоке.
 * Правило React Compiler про них не знает и даёт ложное срабатывание; в рендере
 * `.value` мы не читаем, поэтому компилятору эта мутация не мешает. */
import { type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { PRESS_SCALE, Spring } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressHaptic = "light" | "medium" | "none";

export interface PressableScaleProps extends Omit<PressableProps, "style" | "children"> {
  children?: ReactNode;
  /** Во сколько раз сжимается при нажатии. По умолчанию PRESS_SCALE (0.965). */
  scale?: number;
  /** Отдача пальцу. По умолчанию "light"; "none" — для частых/скроллируемых элементов. */
  haptic?: PressHaptic;
  style?: StyleProp<ViewStyle>;
}

/**
 * Базовая обёртка нажатия для всего приложения.
 *
 * Хаптика срабатывает на палец вниз, а не на навигацию: именно так ведут себя
 * системные элементы iOS. Масштаб анимируем пружиной — она наследует ощущение
 * жеста, поэтому Reduce Motion её не запрещает (это tracking-анимация).
 */
export function PressableScale({
  children,
  scale = PRESS_SCALE,
  haptic = "light",
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const progress = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        progress.value = withSpring(scale, Spring.gentle);
        if (haptic !== "none") {
          void Haptics.impactAsync(
            haptic === "medium"
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light,
          );
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        progress.value = withSpring(1, Spring.press);
        onPressOut?.(event);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
