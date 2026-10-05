/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. */
import { useEffect, type ComponentProps } from "react";
import { StyleSheet, TextInput, type StyleProp, type TextStyle } from "react-native";
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type EasingFunction,
} from "react-native-reanimated";

import { Duration, Ease } from "@/theme";

/**
 * Число считаем на `TextInput`, а не на `Text`, потому что только у него есть
 * нативный проп `text`, который `useAnimatedProps` умеет писать напрямую с
 * UI-потока. Вариант «setState в цикле» дал бы 30+ ре-рендеров React на одно
 * изменение счётчика — ровно то, чего мы избегаем.
 */
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * `text` — нативный проп TextInput, его нет в публичном `TextInputProps`, поэтому
 * тип берём прямо у компонента и приводим один раз здесь, а не рассыпаем `any`.
 */
type AnimatedTextProps = NonNullable<ComponentProps<typeof AnimatedTextInput>["animatedProps"]>;

export interface AnimatedCountProps {
  value: number;
  duration?: number;
  easing?: EasingFunction;
  /** Ширину задаёт вызывающий: TextInput не умеет подстраиваться под контент. */
  style?: StyleProp<TextStyle>;
  maxScale?: number;
}

/** Число, которое «доезжает» до нового значения вместо того, чтобы подменяться. */
export function AnimatedCount({
  value,
  duration = Duration.reveal,
  easing = Ease.power3Out,
  style,
  maxScale = 1.2,
}: AnimatedCountProps) {
  const reduced = useReducedMotion();
  const shown = useSharedValue(value);

  useEffect(() => {
    shown.value = reduced ? value : withTiming(value, { duration, easing });
  }, [value, reduced, duration, easing, shown]);

  const animatedProps = useAnimatedProps<{ text: string }>(() => ({
    text: `${Math.round(shown.value)}`,
  })) as unknown as AnimatedTextProps;

  return (
    <AnimatedTextInput
      animatedProps={animatedProps}
      // первый кадр до того, как UI-поток впервые запишет `text`
      defaultValue={`${value}`}
      editable={false}
      caretHidden
      scrollEnabled={false}
      maxFontSizeMultiplier={maxScale}
      underlineColorAndroid="transparent"
      pointerEvents="none"
      // озвучивает состояние родитель (кольцо дня) — здесь VoiceOver не нужен
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.base, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { padding: 0, margin: 0, textAlign: "center" },
});
