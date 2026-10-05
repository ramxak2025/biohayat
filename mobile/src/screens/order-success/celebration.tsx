/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. Правило React Compiler про
 * них не знает и даёт ложное срабатывание; в рендере `.value` мы не читаем. */
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Ease, radii, Spring, useColors } from "@/theme";

const PARTICLE_COUNT = 18;
const FIELD = 220;
const BADGE = 96;
const FLIGHT_MS = 1200;

interface ParticleConfig {
  dx: number;
  dy: number;
  spin: number;
  delay: number;
  size: number;
  color: string;
}

/**
 * Псевдослучайность с фиксированным зерном: салют должен быть «разным», но
 * одинаковым между рендерами — Math.random() при ре-рендере переставил бы
 * конфетти в воздухе.
 */
function seeded(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function Particle({ config }: { config: ParticleConfig }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withTiming(1, { duration: FLIGHT_MS, easing: Ease.power2Out }),
    );
  }, [config.delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: progress.value * config.dx },
      // взлёт по дуге и падение вниз: один интерполятор вместо двух анимаций
      { translateY: interpolate(progress.value, [0, 0.5, 1], [0, config.dy, config.dy + 90]) },
      { rotate: `${progress.value * config.spin}deg` },
      { scale: interpolate(progress.value, [0, 0.12, 1], [0.3, 1, 0.8]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: config.size,
          height: Math.round(config.size * 0.62),
          borderRadius: Math.max(2, Math.round(config.size / 4)),
          backgroundColor: config.color,
        },
        style,
      ]}
    />
  );
}

/** Печать «заказ принят»: пружинный поп, расходящееся кольцо и конфетти. */
export function Celebration() {
  const colors = useColors();
  const reduced = useReducedMotion();

  const pop = useSharedValue(reduced ? 1 : 0);
  const ring = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    pop.value = withDelay(60, withSpring(1, Spring.pop));
    ring.value = withDelay(120, withTiming(1, { duration: 900, easing: Ease.expoOut }));
  }, [pop, reduced, ring]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.8),
    transform: [{ scale: pop.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.25, 1], [0, 0.35, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [0.8, 1.9]) }],
  }));

  const particles = useMemo<ParticleConfig[]>(() => {
    const palette = [colors.brand, colors.accent, colors.success, colors.sale, colors.info];
    return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      const angle = (index / PARTICLE_COUNT) * Math.PI * 2 + seeded(index, 1) * 0.5;
      const distance = 70 + seeded(index, 2) * 60;
      return {
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance - 40,
        spin: (seeded(index, 3) - 0.5) * 760,
        delay: Math.round(seeded(index, 4) * 180),
        size: 7 + Math.round(seeded(index, 5) * 6),
        color: palette[index % palette.length],
      };
    });
  }, [colors.accent, colors.brand, colors.info, colors.sale, colors.success]);

  return (
    <View style={styles.field} pointerEvents="none" accessibilityElementsHidden>
      {reduced ? null : (
        <View style={styles.center}>
          {particles.map((config, index) => (
            <Particle key={index} config={config} />
          ))}
        </View>
      )}

      {reduced ? null : (
        <Animated.View
          style={[styles.ring, { borderColor: colors.brand }, ringStyle]}
        />
      )}

      <Animated.View style={[styles.badge, { backgroundColor: colors.brand }, badgeStyle]}>
        <SymbolView
          name="checkmark"
          size={44}
          tintColor={colors.textOnBrand}
          weight="bold"
          resizeMode="scaleAspectFit"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { height: FIELD, alignItems: "center", justifyContent: "center" },
  center: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  particle: { position: "absolute" },
  ring: {
    position: "absolute",
    width: BADGE,
    height: BADGE,
    borderRadius: radii.pill,
    borderWidth: 2,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
