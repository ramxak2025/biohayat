/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из воркл-реакции — штатный и единственный способ анимировать на UI-потоке.
 * Правило React Compiler про них не знает и даёт ложное срабатывание; в рендере
 * `.value` мы не читаем, поэтому компилятору эта мутация не мешает. */
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, type CircleProps } from "react-native-svg";

import { Duration, Ease, staggerDelay } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Одна искра вспышки. Геометрия задана в долях от размера холста, чтобы вспышка
 * одинаково читалась и на 18pt сердечке в сетке, и на 22pt на экране товара.
 */
interface Spark {
  /** Направление разлёта, рад. */
  angle: number;
  /** Дальность как доля радиуса холста. */
  distance: number;
  /** Размер точки относительно базового. */
  scale: number;
  /** Задержка старта, мс. */
  delay: number;
}

/** Порядок раздачи задержек — вразнобой, а не по кругу (см. SPARKS). */
const DELAY_ORDER = [0, 3, 1, 4, 2, 5] as const;

/**
 * Шесть искр по окружности. Чередуем дальность и размер, а задержки раздаём не
 * по кругу, а вразнобой: ровный «снежинкой» разлёт сразу читается как
 * сгенерированный, неровный — как нарисованный руками.
 */
const SPARKS: readonly Spark[] = DELAY_ORDER.map((delayIndex, i) => ({
  angle: (-90 + i * 60) * (Math.PI / 180),
  distance: i % 2 === 0 ? 1 : 0.76,
  scale: i % 2 === 0 ? 1 : 0.7,
  // staggerDelay — общий токен лестницы задержек; шаг мелкий, вспышка короткая.
  delay: staggerDelay(delayIndex, 22, 5),
}));

export interface HeartBurstProps {
  /**
   * Счётчик вспышек. Любое изменение значения запускает новую вспышку —
   * реакция живёт на UI-потоке, поэтому запуск не стоит ни одного ререндера.
   */
  token: SharedValue<number>;
  /** Цвет кольца и искр. Берётся из useColors() вызывающей стороной. */
  color: string;
  /** Диаметр холста вспышки, pt. */
  size?: number;
}

/**
 * Вспышка вокруг сердечка: расходящееся кольцо + шесть искр.
 *
 * Почему чистый Reanimated + react-native-svg, а не библиотека частиц: всё
 * движение здесь — это четыре числовых свойства круга (cx, cy, r, opacity),
 * которые Reanimated пишет напрямую в нативную вьюху на UI-потоке. Любая
 * «библиотека частиц» в RN гоняла бы те же числа через JS-поток.
 *
 * Компонент смонтирован всегда, а не появляется по нажатию: при p = 0 радиусы
 * нулевые и прозрачность нулевая — в покое он не рисует ни пикселя, зато первый
 * кадр вспышки не теряется на монтирование. Ререндеров у него нет вообще:
 * memo + запуск через shared value.
 */
export const HeartBurst = memo(function HeartBurst({ token, color, size = 52 }: HeartBurstProps) {
  return (
    // pointerEvents="none" — вспышка не должна перехватывать нажатия кнопки.
    <View pointerEvents="none" style={styles.layer}>
      <Svg width={size} height={size}>
        <BurstRing token={token} color={color} size={size} />
        {SPARKS.map((spark) => (
          <BurstSpark key={spark.angle} token={token} color={color} size={size} spark={spark} />
        ))}
      </Svg>
    </View>
  );
});

interface LayerProps {
  token: SharedValue<number>;
  color: string;
  size: number;
}

/** Кольцо: расходится наружу и растворяется. Кривая — GSAP expo.out. */
function BurstRing({ token, color, size }: LayerProps) {
  const p = useSharedValue(0);
  const center = size / 2;

  useAnimatedReaction(
    () => token.value,
    (current, previous) => {
      if (previous === null || current === previous) return;
      // Сброс + старт в одном кадре UI-потока: если предыдущая вспышка ещё
      // играла, она отменяется, и новая честно начинается с нуля.
      p.value = 0;
      p.value = withTiming(1, { duration: Duration.slow, easing: Ease.expoOut });
    },
  );

  const animatedProps = useAnimatedProps<CircleProps>(() => ({
    r: interpolate(p.value, [0, 1], [size * 0.11, size * 0.43]),
    // Кольцо утончается по мере расхождения — так оно «растворяется», а не
    // просто гаснет; толстый старт даёт ощущение удара.
    strokeWidth: interpolate(
      p.value,
      [0, 0.3, 1],
      [size * 0.13, size * 0.06, 0.5],
      Extrapolation.CLAMP,
    ),
    // Первые 5% — мгновенный подъём из нуля: в покое (p = 0) кольца не видно.
    opacity: interpolate(p.value, [0, 0.05, 0.55, 1], [0, 0.9, 0.4, 0], Extrapolation.CLAMP),
  }));

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={0}
      fill="none"
      stroke={color}
      animatedProps={animatedProps}
    />
  );
}

/** Искра: разлетается по своему лучу с GSAP power2.out и своей задержкой. */
function BurstSpark({ token, color, size, spark }: LayerProps & { spark: Spark }) {
  const p = useSharedValue(0);
  const center = size / 2;

  useAnimatedReaction(
    () => token.value,
    (current, previous) => {
      if (previous === null || current === previous) return;
      p.value = 0;
      p.value = withDelay(
        spark.delay,
        withTiming(1, { duration: Duration.reveal, easing: Ease.power2Out }),
      );
    },
  );

  const animatedProps = useAnimatedProps<CircleProps>(() => {
    const travel = interpolate(p.value, [0, 1], [size * 0.16, size * 0.46 * spark.distance]);
    return {
      cx: center + Math.cos(spark.angle) * travel,
      cy: center + Math.sin(spark.angle) * travel,
      // Точка набухает и схлопывается: r = 0 на обоих концах, поэтому в покое
      // искра не рисуется вообще.
      r: interpolate(p.value, [0, 0.3, 1], [0, size * 0.05 * spark.scale, 0], Extrapolation.CLAMP),
      opacity: interpolate(p.value, [0, 0.12, 0.7, 1], [0, 1, 0.85, 0], Extrapolation.CLAMP),
    };
  });

  return <AnimatedCircle cx={center} cy={center} r={0} fill={color} animatedProps={animatedProps} />;
}

const styles = StyleSheet.create({
  // Холст центрируется по кнопке и не участвует в раскладке.
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
