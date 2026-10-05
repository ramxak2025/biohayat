/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. Правило React Compiler
 * про shared values не знает; в рендере `.value` мы не читаем. */
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Duration, Ease, Spring } from "@/theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Геометрия дуги. Считаем её руками, а не подбираем на глаз, потому что для
 * анимации отрисовки нужна ТОЧНАЯ длина: `strokeDasharray` короче дуги оставит
 * хвост ненарисованным, длиннее — линия «доедет» раньше времени.
 *
 *   хорда c = 72, подъём h = 12  →  R = (c²/4 + h²) / (2h) = 60
 *   полуугол α = asin(c / 2R) = asin(0.6) = 0.6435 рад
 *   длина L = R · 2α = 60 · 1.2870 = 77.22
 */
const LINK_WIDTH = 84;
const LINK_HEIGHT = 40;
const BASE_Y = 27;
const LEFT_X = 6;
const RIGHT_X = 78;
const ARC_RADIUS = 60;
const ARC_LENGTH = 77.3;
const APEX_Y = BASE_Y - 12;
const NODE_R = 4.2;
const SEAL_SIZE = 20;
/** sweep-flag = 1: в SVG ось Y смотрит вниз, поэтому «по часовой» — это дуга сверху. */
const ARC_PATH = `M ${LEFT_X} ${BASE_Y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${RIGHT_X} ${BASE_Y}`;

/** Такты раскадровки, мс от общей задержки карточки. */
const T_DRAW = 90;
const T_LANDED = T_DRAW + 300;
const T_SEAL = T_DRAW + 360;

export interface PairLinkProps {
  /** Цвет связи по типу правила: зелёный / янтарный / красный. */
  tint: string;
  soft: string;
  icon: SFSymbol;
  /** Задержка появления карточки — связь рисуется сразу после её посадки. */
  delay: number;
}

/**
 * Связь между двумя компонентами — главный визуальный приём экрана.
 *
 * Дуга рисуется через `strokeDashoffset` в `useAnimatedProps`: CSS-переходы
 * Reanimated до SVG-пропсов не доходят (shared value меняет проп напрямую,
 * минуя ре-рендер), а анимировать длину линии трансформом нельзя.
 *
 * Раскадровка читается как жест: узел A → линия идёт к B → B её «ловит» →
 * в вершине проступает печать типа. При Reduce Motion весь кадр показывается
 * сразу: связь остаётся видимой и цветной, исчезает только сама отрисовка.
 */
export function PairLink({ tint, soft, icon, delay }: PairLinkProps) {
  const reduced = useReducedMotion();

  const draw = useSharedValue(reduced ? 1 : 0);
  const from = useSharedValue(reduced ? 1 : 0);
  const to = useSharedValue(reduced ? 1 : 0);
  const seal = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      draw.value = 1;
      from.value = 1;
      to.value = 1;
      seal.value = 1;
      return;
    }

    from.value = withDelay(delay, withSpring(1, Spring.pop));
    draw.value = withDelay(
      delay + T_DRAW,
      withTiming(1, { duration: Duration.reveal, easing: Ease.power3Out }),
    );
    to.value = withDelay(delay + T_LANDED, withSpring(1, Spring.pop));
    seal.value = withDelay(delay + T_SEAL, withSpring(1, Spring.pop));
  }, [delay, reduced, draw, from, to, seal]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: ARC_LENGTH * (1 - draw.value),
  }));
  const fromProps = useAnimatedProps(() => ({ r: NODE_R * from.value }));
  const toProps = useAnimatedProps(() => ({ r: NODE_R * to.value }));

  const sealStyle = useAnimatedStyle(() => ({
    // пружина перелетает через 1 — масштабу это и нужно, прозрачности нет
    opacity: Math.min(1, seal.value),
    transform: [{ scale: seal.value }],
  }));

  return (
    <View
      style={styles.wrap}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={LINK_WIDTH} height={LINK_HEIGHT}>
        {/* «рельс»: показывает, куда придёт линия, и держит композицию до отрисовки */}
        <Path d={ARC_PATH} stroke={soft} strokeWidth={2} fill="none" strokeLinecap="round" />
        <AnimatedPath
          d={ARC_PATH}
          stroke={tint}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          fill="none"
          animatedProps={arcProps}
        />
        {/* r={0} — стартовое значение для SVG: радиус приезжает из animatedProps */}
        <AnimatedCircle cx={LEFT_X} cy={BASE_Y} r={0} fill={tint} animatedProps={fromProps} />
        <AnimatedCircle cx={RIGHT_X} cy={BASE_Y} r={0} fill={tint} animatedProps={toProps} />
      </Svg>

      <Animated.View
        style={[styles.seal, { backgroundColor: soft, borderColor: tint }, sealStyle]}
      >
        <SymbolView name={icon} size={11} tintColor={tint} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: LINK_WIDTH, height: LINK_HEIGHT },
  seal: {
    position: "absolute",
    left: (LINK_WIDTH - SEAL_SIZE) / 2,
    top: APEX_Y - SEAL_SIZE / 2,
    width: SEAL_SIZE,
    height: SEAL_SIZE,
    borderRadius: SEAL_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
