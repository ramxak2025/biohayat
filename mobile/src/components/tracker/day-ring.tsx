/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. Правило React Compiler
 * про shared values не знает; в рендере `.value` мы не читаем. */
import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Duration, Ease, Spring, useColors } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DayRingProps {
  taken: number;
  planned: number;
  size?: number;
  stroke?: number;
  /** Содержимое в центре кольца. */
  children?: ReactNode;
  /** Цвет заполнения; по умолчанию брендовый, на 100 % — успех. */
  tint?: string;
  /**
   * Короткий «поп» в момент, когда день закрывается полностью. Выключаем там,
   * где колец много (недельная полоса), иначе экран дёргается семью местами.
   */
  celebrate?: boolean;
  /**
   * Что именно показывает кольцо (обычно — дата). Смена ключа означает «это
   * другие данные», а не «пользователь закрыл день»: празднуем только второе,
   * иначе кольцо поздравляло бы при простом перелистывании недели.
   */
  contextKey?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Кольцо прогресса дня.
 *
 * Внутри SVG анимируем `strokeDashoffset` через `useAnimatedProps` — CSS-переходы
 * Reanimated на SVG-пропсы не действуют, потому что shared value меняет проп
 * напрямую, минуя ре-рендер.
 *
 * Две разные длительности не случайны: первое появление тянется `Duration.slow`
 * (это «дорогой» момент загрузки экрана), а каждое следующее дотягивание —
 * `Duration.reveal`, потому что оно идёт вслед за пальцем и не должно отставать
 * от галочки в чипе.
 */
export function DayRing({
  taken,
  planned,
  size = 104,
  stroke = 10,
  children,
  tint,
  celebrate = true,
  contextKey,
  style,
  accessibilityLabel,
}: DayRingProps) {
  const colors = useColors();
  const reduced = useReducedMotion();

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = planned > 0 ? Math.min(1, taken / planned) : 0;
  const complete = planned > 0 && taken >= planned;

  const progress = useSharedValue(reduced ? ratio : 0);
  const done = useSharedValue(complete ? 1 : 0);
  const pop = useSharedValue(1);

  const mounted = useRef(false);
  const wasComplete = useRef(complete);
  const prevContext = useRef(contextKey);

  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    const sameContext = prevContext.current === contextKey;
    prevContext.current = contextKey;

    if (reduced) {
      progress.value = ratio;
      done.value = complete ? 1 : 0;
    } else {
      progress.value = first
        ? withDelay(
            Duration.instant,
            withTiming(ratio, { duration: Duration.slow, easing: Ease.power3Out }),
          )
        : withTiming(ratio, { duration: Duration.reveal, easing: Ease.power3Out });
      done.value = withTiming(complete ? 1 : 0, {
        duration: Duration.base,
        easing: Ease.power2Out,
      });

      // закрыт последний слот дня — отдельный момент, ровно один «поп», без циклов
      if (!first && sameContext && celebrate && complete && !wasComplete.current) {
        pop.value = withSequence(withSpring(1.075, Spring.pop), withSpring(1, Spring.press));
      }
    }

    wasComplete.current = complete;
  }, [ratio, complete, celebrate, contextKey, reduced, progress, done, pop]);

  const baseColor = tint ?? colors.brand;
  const doneColor = tint ?? colors.success;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    stroke: interpolateColor(done.value, [0, 1], [baseColor, doneColor]),
  }));

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <Animated.View
      style={[{ width: size, height: size }, styles.wrap, popStyle, style]}
      accessible={accessibilityLabel !== undefined}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: planned, now: taken }}
    >
      {/* поворот, чтобы заполнение начиналось с 12 часов, а не с 3 */}
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceSunken}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          // статический цвет — страховка на первый кадр: animatedProps его перекроет
          stroke={baseColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          fill="none"
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  svg: { transform: [{ rotate: "-90deg" }] },
  center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
});
