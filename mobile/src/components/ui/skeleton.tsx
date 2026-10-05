/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика/эффекта — штатный и единственный способ анимировать на UI-потоке.
 * Правило React Compiler про них не знает и даёт ложное срабатывание; в рендере
 * `.value` мы не читаем, поэтому компилятору эта мутация не мешает. */
import { useEffect, useState } from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Ease, radii, spacing, useColors, useTheme } from "@/theme";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Плейсхолдер с бликом. При Reduce Motion блик не запускается — остаётся ровная плашка. */
export function Skeleton({ width = "100%", height = 14, radius = radii.sm, style }: SkeletonProps) {
  const colors = useColors();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [boxWidth, setBoxWidth] = useState(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduced || boxWidth === 0) return;
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: 1150, easing: Ease.power2InOut }), -1, false);
  }, [reduced, boxWidth, sweep]);

  const shine = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-boxWidth, boxWidth]) }],
  }));

  const highlight = theme.dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.72)";

  return (
    <View
      onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.surfaceSunken, overflow: "hidden" },
        style,
      ]}
    >
      {reduced || boxWidth === 0 ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, shine]}>
          <LinearGradient
            colors={["transparent", highlight, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

export interface ProductCardSkeletonProps {
  layout?: "grid" | "row";
  width?: number;
}

/** Повторяет метрику ProductCard, чтобы при подгрузке ничего не «прыгало». */
export function ProductCardSkeleton({ layout = "grid", width }: ProductCardSkeletonProps) {
  const colors = useColors();

  if (layout === "row") {
    return (
      <View style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Skeleton width={84} height={84} radius={radii.lg} />
        <View style={styles.rowBody}>
          <Skeleton width="85%" height={13} />
          <Skeleton width="55%" height={13} />
          <Skeleton width={90} height={20} radius={radii.sm} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.gridCard,
        { backgroundColor: colors.surface, borderColor: colors.line },
        width ? { width } : null,
      ]}
    >
      <View style={styles.gridImage}>
        <Skeleton width="100%" height="100%" radius={radii.xl} />
      </View>
      <View style={styles.gridBody}>
        <Skeleton width="45%" height={10} />
        <Skeleton width="95%" height={13} />
        <Skeleton width="70%" height={13} />
        <Skeleton width={80} height={22} radius={radii.sm} />
        <Skeleton width="100%" height={36} radius={radii.pill} />
      </View>
    </View>
  );
}

export interface ListSkeletonProps {
  count?: number;
  variant?: "line" | "row" | "grid";
  style?: StyleProp<ViewStyle>;
}

/** Набор плейсхолдеров для первого рендера экрана. */
export function ListSkeleton({ count = 6, variant = "row", style }: ListSkeletonProps) {
  const items = Array.from({ length: count }, (_, index) => index);

  if (variant === "grid") {
    return (
      <View style={[styles.grid, style]}>
        {items.map((index) => (
          <View key={index} style={styles.gridCell}>
            <ProductCardSkeleton layout="grid" />
          </View>
        ))}
      </View>
    );
  }

  if (variant === "row") {
    return (
      <View style={[styles.stack, style]}>
        {items.map((index) => (
          <ProductCardSkeleton key={index} layout="row" />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.stack, style]}>
      {items.map((index) => (
        <Skeleton key={index} height={16} width={index % 3 === 2 ? "60%" : "100%"} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -spacing.sm + 2 },
  gridCell: { width: "50%", paddingHorizontal: spacing.sm - 2, paddingBottom: spacing.md },
  gridCard: {
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  gridImage: { width: "100%", aspectRatio: 1 },
  gridBody: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  rowCard: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  rowBody: { flex: 1, gap: spacing.sm, justifyContent: "center" },
});
