/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. Правило React Compiler про
 * shared values не знает и даёт ложное срабатывание; в рендере `.value` не читаем. */
import { Fragment, useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { ORDER_FLOW, ORDER_STATUS_LABELS, type OrderStatus } from "@/api/types";
import { AppText } from "@/components/ui";
import { Duration, Ease, radii, spacing, useColors } from "@/theme";

import { ORDER_STATUS_ICON, orderStepIndex } from "./order-status";

const STEP_WIDTH = 74;
const DOT = 28;
const COMPACT_DOT = 10;
const TRACK = 3;

interface FillProps {
  done: boolean;
  index: number;
  color: string;
  height: number;
}

/** Заливка сегмента: «прорастает» слева направо с лёгкой лесенкой по шагам. */
function SegmentFill({ done, index, color, height }: FillProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(done && reduced ? 1 : 0);

  useEffect(() => {
    if (!done) {
      progress.value = withTiming(0, { duration: Duration.fast });
      return;
    }
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      index * 70,
      withTiming(1, { duration: Duration.base, easing: Ease.power2Out }),
    );
  }, [done, reduced, index, progress]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: color, height, borderRadius: TRACK },
        styles.fillOrigin,
        style,
      ]}
    />
  );
}

export interface OrderProgressProps {
  status: OrderStatus;
  /** Тонкая шкала без подписей — для карточки в списке. */
  compact?: boolean;
}

/**
 * Прогресс заказа по ORDER_FLOW. Для отменённого заказа шкала не рисуется —
 * цепочка статусов к нему больше не относится.
 */
export function OrderProgress({ status, compact = false }: OrderProgressProps) {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const current = orderStepIndex(status);

  useEffect(() => {
    if (compact || current < 2) return;
    // подкручиваем к текущему шагу: иначе на длинной цепочке он остаётся за кадром
    const timer = setTimeout(
      () => scrollRef.current?.scrollTo({ x: (current - 1) * STEP_WIDTH, animated: true }),
      400,
    );
    return () => clearTimeout(timer);
  }, [compact, current]);

  if (status === "CANCELLED") {
    if (compact) return null;
    return (
      <View style={[styles.cancelled, { backgroundColor: colors.surfaceSunken }]}>
        <SymbolView name="xmark.circle.fill" size={17} tintColor={colors.danger} />
        <AppText variant="subhead" color="danger" weight="600">
          Заказ отменён
        </AppText>
      </View>
    );
  }

  if (compact) {
    return (
      <View
        style={styles.compactRow}
        accessibilityRole="progressbar"
        accessibilityLabel={`Статус: ${ORDER_STATUS_LABELS[status]}, шаг ${current + 1} из ${ORDER_FLOW.length}`}
      >
        {ORDER_FLOW.map((step, index) => {
          const done = index <= current;
          return (
            <Fragment key={step}>
              {index > 0 ? (
                <View style={[styles.compactTrack, { backgroundColor: colors.surfaceSunken }]}>
                  <SegmentFill done={done} index={index} color={colors.brand} height={TRACK} />
                </View>
              ) : null}
              <View
                style={[
                  styles.compactDot,
                  { backgroundColor: done ? colors.brand : colors.surfaceSunken },
                ]}
              />
            </Fragment>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      accessibilityLabel={`Статус заказа: ${ORDER_STATUS_LABELS[status]}. Шаг ${current + 1} из ${ORDER_FLOW.length}`}
    >
      {ORDER_FLOW.map((step, index) => {
        const done = index <= current;
        const isCurrent = index === current;

        return (
          <View key={step} style={styles.step}>
            <View style={styles.dotRow}>
              {index > 0 ? (
                <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
                  <SegmentFill done={done} index={index} color={colors.brand} height={TRACK} />
                </View>
              ) : (
                <View style={styles.track} />
              )}

              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done ? colors.brand : colors.surface,
                    borderColor: done ? colors.brand : colors.line,
                  },
                  isCurrent ? styles.dotCurrent : null,
                ]}
              >
                <SymbolView
                  name={ORDER_STATUS_ICON[step]}
                  size={13}
                  tintColor={done ? colors.textOnBrand : colors.textFaint}
                  weight="semibold"
                />
              </View>

              {index < ORDER_FLOW.length - 1 ? (
                <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
                  <SegmentFill
                    done={index < current}
                    index={index}
                    color={colors.brand}
                    height={TRACK}
                  />
                </View>
              ) : (
                <View style={styles.track} />
              )}
            </View>

            <AppText
              variant="caption2"
              align="center"
              numberOfLines={2}
              maxScale={1.3}
              color={done ? "brand" : "faint"}
              weight={isCurrent ? "700" : "500"}
              style={styles.label}
            >
              {ORDER_STATUS_LABELS[step]}
            </AppText>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { paddingVertical: spacing.sm },
  step: { width: STEP_WIDTH, alignItems: "center" },
  dotRow: { flexDirection: "row", alignItems: "center", width: STEP_WIDTH },
  track: { flex: 1, height: TRACK, borderRadius: TRACK, overflow: "hidden" },
  fillOrigin: { transformOrigin: "left" },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCurrent: { transform: [{ scale: 1.14 }] },
  label: { marginTop: spacing.sm, paddingHorizontal: 2 },
  compactRow: { flexDirection: "row", alignItems: "center" },
  compactTrack: { flex: 1, height: TRACK, borderRadius: TRACK, overflow: "hidden" },
  compactDot: { width: COMPACT_DOT, height: COMPACT_DOT, borderRadius: radii.pill },
  cancelled: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
});
