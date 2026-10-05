/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. */
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  ZoomIn,
} from "react-native-reanimated";

import { AppText, PressableScale } from "@/components/ui";
import { weekdayShort } from "@/lib/format";
import { Duration, Ease, MIN_TAP_SIZE, radii, spacing, Spring, useColors } from "@/theme";

import { DayRing } from "./day-ring";
import { dayTitle, type DayProgress } from "./plan-utils";

export interface WeekStripProps {
  days: readonly string[];
  selected: string;
  today: string;
  onSelect: (day: string) => void;
  progressOf: (day: string) => DayProgress;
  style?: StyleProp<ViewStyle>;
}

/**
 * Неделя одной строкой: мини-кольцо на каждый день, тап переключает выбранный.
 *
 * Подсветка выбранного дня — ОДНА плашка, которая переезжает пружиной, а не семь
 * перекрашивающихся фонов. Так глаз видит связь «был здесь → стал тут», а не
 * мигание двух прямоугольников; и перерисовывается при этом только transform.
 */
export function WeekStrip({ days, selected, today, onSelect, progressOf, style }: WeekStripProps) {
  const colors = useColors();
  const reduced = useReducedMotion();

  const [rowWidth, setRowWidth] = useState(0);
  const cell = days.length > 0 && rowWidth > 0 ? rowWidth / days.length : 0;
  const index = Math.max(0, days.indexOf(selected));

  const slide = useSharedValue(0);
  /** Первая раскладка не должна выглядеть как «подсветка приехала слева». */
  const placed = useRef(false);

  useEffect(() => {
    if (cell === 0) return;
    const x = index * cell;
    if (!placed.current || reduced) {
      placed.current = true;
      slide.value = x;
      return;
    }
    slide.value = withSpring(x, Spring.press);
  }, [index, cell, reduced, slide]);

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value }],
  }));

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setRowWidth((prev) => (prev === width ? prev : width));
  }, []);

  return (
    <View style={[styles.row, style]} accessibilityRole="tablist" onLayout={handleLayout}>
      {cell > 0 ? (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.highlight,
            { width: cell, backgroundColor: colors.surfaceSunken },
            highlightStyle,
          ]}
        />
      ) : null}

      {days.map((day) => {
        const { planned, taken } = progressOf(day);
        const isSelected = day === selected;
        const isToday = day === today;
        const complete = planned > 0 && taken >= planned;

        return (
          <PressableScale
            key={day}
            haptic="none"
            onPress={() => {
              // selectionAsync — системный «щелчок» смены выбора, ровно один на тап
              void Haptics.selectionAsync();
              onSelect(day);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={
              planned > 0
                ? `${dayTitle(day, today)}, отмечено ${taken} из ${planned}`
                : `${dayTitle(day, today)}, приёмов нет`
            }
            style={styles.day}
          >
            <AppText
              variant="caption2"
              color={isToday ? "brand" : "faint"}
              weight={isToday ? "700" : "500"}
              maxScale={1.2}
            >
              {weekdayShort(day).toUpperCase()}
            </AppText>

            {/* celebrate=false: «поп» закрытого дня отыгрывает большое кольцо,
                семь одновременных пружин были бы шумом */}
            <DayRing
              taken={taken}
              planned={planned}
              size={36}
              stroke={3}
              celebrate={false}
              style={styles.ring}
            >
              {complete ? (
                <Animated.View
                  entering={
                    reduced ? undefined : ZoomIn.duration(Duration.base).easing(Ease.backOut)
                  }
                >
                  <SymbolView name="checkmark" size={14} tintColor={colors.success} weight="bold" />
                </Animated.View>
              ) : (
                <AppText
                  variant="footnote"
                  weight={isSelected ? "700" : "600"}
                  color={planned > 0 ? "text" : "faint"}
                  maxScale={1.2}
                >
                  {Number(day.slice(8, 10))}
                </AppText>
              )}
            </DayRing>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  highlight: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radii.lg,
  },
  day: {
    flex: 1,
    minHeight: MIN_TAP_SIZE + 22,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  ring: { marginTop: 2 },
});
