/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. Правило React Compiler про
 * них не знает и даёт ложное срабатывание; в рендере `.value` мы не читаем. */
import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/components/ui";
import { formatKopecks } from "@/lib/format";
import { Duration, Ease, radii, spacing, useColors } from "@/theme";

export interface FreeDeliveryProgressProps {
  totalKopecks: number;
  thresholdKopecks: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Полоса прогресса до бесплатной доставки — привычный маркетплейсный стимул
 * «добрать до порога». Чистый UI: сервер стоимость доставки не считает вообще
 * (в заказе нет ни способа, ни суммы), поэтому ниже честно написано, что итог
 * назовёт менеджер.
 */
export function FreeDeliveryProgress({
  totalKopecks,
  thresholdKopecks,
  style,
}: FreeDeliveryProgressProps) {
  const colors = useColors();
  const reduced = useReducedMotion();

  const ratio =
    thresholdKopecks > 0 ? Math.min(1, Math.max(0, totalKopecks / thresholdKopecks)) : 1;
  const reached = totalKopecks >= thresholdKopecks;
  const left = Math.max(0, thresholdKopecks - totalKopecks);

  const title = reached ? "Бесплатная доставка" : `До бесплатной доставки ещё ${formatKopecks(left)}`;

  const progress = useSharedValue(reduced ? ratio : 0);

  useEffect(() => {
    progress.value = reduced
      ? ratio
      : withTiming(ratio, { duration: Duration.slow, easing: Ease.power3Out });
  }, [progress, ratio, reduced]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={title}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={[
        styles.wrap,
        { backgroundColor: colors.surface, borderColor: colors.line },
        style,
      ]}
    >
      <View style={styles.head}>
        <SymbolView
          name={reached ? "checkmark.seal.fill" : "shippingbox"}
          size={17}
          tintColor={reached ? colors.success : colors.brand}
        />
        <AppText
          variant="subhead"
          weight="600"
          style={[styles.headText, reached ? { color: colors.success } : null]}
        >
          {title}
        </AppText>
      </View>

      <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: reached ? colors.success : colors.brand },
            fillStyle,
          ]}
        />
      </View>

      <AppText variant="caption" color="faint">
        {reached
          ? `Порог ${formatKopecks(thresholdKopecks)} пройден. Способ и сроки доставки менеджер согласует при подтверждении.`
          : `Бесплатная доставка от ${formatKopecks(thresholdKopecks)}. Стоимость доставки рассчитает менеджер.`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    padding: spacing.base,
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headText: { flex: 1 },
  track: { height: 8, borderRadius: radii.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radii.pill },
});
