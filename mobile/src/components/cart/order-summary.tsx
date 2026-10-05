/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. Правило React Compiler про
 * них не знает и даёт ложное срабатывание; в рендере `.value` мы не читаем. */
import { useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AppText, Divider, PressableScale } from "@/components/ui";
import { formatKopecks, plural } from "@/lib/format";
import type { CartLine } from "@/store/cart";
import { Duration, Ease, MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

import type { CartTotals } from "./pricing";

export interface OrderSummaryProps {
  lines: CartLine[];
  totals: CartTotals;
  /** Раскрыт ли состав при первом показе. По умолчанию свёрнут. */
  defaultExpanded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Сводка заказа на экране оформления: свёрнутая строка «N товаров на сумму X»
 * с раскрытием состава. Форма привычная — состав заказа виден по требованию и
 * не отодвигает поля вниз, но проверить его можно, не возвращаясь в корзину.
 */
export function OrderSummary({ lines, totals, defaultExpanded = false, style }: OrderSummaryProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const turn = useSharedValue(defaultExpanded ? 1 : 0);

  useEffect(() => {
    const target = expanded ? 1 : 0;
    turn.value = reduced
      ? target
      : withTiming(target, { duration: Duration.fast, easing: Ease.power2Out });
  }, [expanded, reduced, turn]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 180}deg` }],
  }));

  const title = `${totals.count} ${plural(totals.count, "товар", "товара", "товаров")} на сумму ${formatKopecks(totals.totalKopecks)}`;

  return (
    <Animated.View
      collapsable={false}
      layout={reduced ? undefined : LinearTransition.duration(Duration.base).easing(Ease.power2Out)}
      style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.line }, style]}
    >
      <PressableScale
        onPress={() => setExpanded((prev) => !prev)}
        haptic="none"
        scale={0.99}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Состав заказа: ${title}`}
        accessibilityHint={expanded ? "Свернуть состав заказа" : "Показать состав заказа"}
        style={styles.head}
      >
        <AppText variant="subhead" weight="600" style={styles.headText}>
          {title}
        </AppText>
        <Animated.View style={chevronStyle}>
          <SymbolView name="chevron.down" size={13} tintColor={colors.textMuted} weight="semibold" />
        </Animated.View>
      </PressableScale>

      {expanded ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(Duration.fast)}
          exiting={reduced ? undefined : FadeOut.duration(Duration.instant)}
          style={styles.body}
        >
          <Divider />

          {lines.map((line) => (
            <View key={line.id} style={styles.row}>
              <View style={[styles.thumb, { backgroundColor: colors.surfaceSunken }]}>
                {line.image ? (
                  <Image
                    source={{ uri: line.image }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={180}
                    cachePolicy="memory-disk"
                    recyclingKey={line.id}
                    accessibilityIgnoresInvertColors
                    alt={line.name}
                  />
                ) : (
                  <View style={styles.noImage}>
                    <SymbolView name="leaf" size={15} tintColor={colors.brand} />
                  </View>
                )}
              </View>

              <View style={styles.lineBody}>
                <AppText variant="subhead" numberOfLines={2}>
                  {line.name}
                </AppText>
                <AppText variant="caption" color="faint">
                  {formatKopecks(line.priceKopecks)} × {line.qty}
                </AppText>
              </View>

              <AppText variant="subhead" weight="700" maxScale={1.4}>
                {formatKopecks(line.priceKopecks * line.qty)}
              </AppText>
            </View>
          ))}

          {totals.discountKopecks > 0 ? (
            <View style={styles.totalRow}>
              <AppText variant="subhead" color="muted">
                Скидка
              </AppText>
              <AppText variant="subhead" weight="600" style={{ color: colors.sale }}>
                −{formatKopecks(totals.discountKopecks)}
              </AppText>
            </View>
          ) : null}

          <Divider />

          <View style={styles.totalRow}>
            <AppText variant="headline">Итого за товары</AppText>
            <AppText variant="title3" weight="800" maxScale={1.4}>
              {formatKopecks(totals.totalKopecks)}
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: MIN_TAP_SIZE + 6,
  },
  headText: { flex: 1 },
  body: { gap: spacing.md, paddingBottom: spacing.base },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumb: { width: 44, height: 44, borderRadius: radii.md, overflow: "hidden" },
  noImage: { flex: 1, alignItems: "center", justifyContent: "center" },
  lineBody: { flex: 1, gap: 2 },
  totalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
  },
});
