/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика — штатный способ анимировать на UI-потоке. Правило React
 * Compiler про shared values не знает и даёт ложное срабатывание. */
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  type AnimatedRef,
} from "react-native-reanimated";

import type { Product } from "@/api/types";
import { AppText, Button, GlassSurface, Price, PressableScale, Stepper } from "@/components/ui";
import { plural } from "@/lib/format";
import { useFlyToCart } from "@/components/fx/flight";
import { useCart } from "@/store/cart";
import { Duration, radii, shadows, spacing, Spring, useColors } from "@/theme";

/** Сколько держим подтверждение «Добавлено» перед тем, как убрать его. */
const FLASH_MS = 1800;

export interface ProductBuyBarProps {
  product: Product;
  style?: StyleProp<ViewStyle>;
  /**
   * Вью, из которой вылетает копия товара (галерея на экране товара).
   * Без неё панель просто кладёт товар в корзину — без полёта.
   */
  flightSource?: AnimatedRef<View>;
}

/**
 * Плавающая панель покупки на стекле — единственный «стеклянный» элемент экрана
 * и единственная тонированная кнопка на нём (HIG: стекло только в слое
 * навигации, цвет — только на главном действии).
 */
export function ProductBuyBar({ product, style, flightSource }: ProductBuyBarProps) {
  const colors = useColors();
  const router = useRouter();
  const reduced = useReducedMotion();
  const flyToCart = useFlyToCart();
  const { width, fontScale } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  // 320 pt fits a readable price block plus the primary action. Dynamic Type
  // reduces the effective width instead of reducing the user's text size.
  const availableWidth = rowWidth || width - spacing.base * 2 - (spacing.sm + 2) * 2;
  const stacked = availableWidth / Math.min(fontScale, 1.5) < 320;

  const line = useCart((state) => state.lines.find((item) => item.id === product.id));
  const add = useCart((state) => state.add);
  const setQty = useCart((state) => state.setQty);
  const remove = useCart((state) => state.remove);

  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const land = useCallback(() => {
    add(product, 1);
    // успех-хаптика именно notification: покупка — это результат, а не касание
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!reduced) {
      pop.value = withSequence(withSpring(1.035, Spring.pop), withSpring(1, Spring.press));
    }
    setFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), FLASH_MS);
  }, [add, product, reduced, pop]);

  const onAdd = useCallback(() => {
    // Товар попадает в корзину в момент ПРИЗЕМЛЕНИЯ копии: тогда «поп» счётчика,
    // хаптика и прилёт читаются как одно событие. Если источника нет, провайдер
    // приземляет запрос сразу — поведение не ломается.
    if (flightSource) {
      flyToCart({ source: flightSource, image: product.image, onLand: land });
      return;
    }
    land();
  }, [flightSource, flyToCart, product.image, land]);

  const qty = line?.qty ?? 0;
  const totalKopecks = product.price.kopecks * Math.max(1, qty);

  return (
    <View style={[styles.column, style]} pointerEvents="box-none">
      {flash && qty > 0 ? (
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(Duration.fast)}
          exiting={reduced ? undefined : FadeOut.duration(Duration.fast)}
          style={[styles.flash, { backgroundColor: colors.brand }, shadows.sm]}
          accessibilityLiveRegion="polite"
        >
          <SymbolView name="checkmark.circle.fill" size={15} tintColor={colors.textOnBrand} />
          <AppText variant="footnote" weight="600" style={[styles.flashText, { color: colors.textOnBrand }]}>
            Добавлено в корзину
          </AppText>
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.shadow, shadows.md, popStyle]}>
        <GlassSurface style={styles.glass}>
          {!product.inStock ? (
            <AppText variant="caption" color="muted" style={styles.note}>
              Товара сейчас нет в наличии. Посмотрите похожие ниже — или вернитесь позже.
            </AppText>
          ) : null}

          <Animated.View
            layout={reduced ? undefined : LinearTransition.duration(Duration.base)}
            style={[styles.row, stacked ? styles.stacked : null]}
            onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
          >
            {qty > 0 ? (
              <PressableScale
                haptic="none"
                onPress={() => router.push("/cart" as Href)}
                accessibilityRole="button"
                accessibilityLabel={`В корзине ${qty} ${plural(qty, "штука", "штуки", "штук")}. Перейти в корзину`}
                style={[styles.info, stacked ? styles.stackedInfo : null]}
              >
                <View style={styles.infoRow}>
                  <AppText variant="caption" color="brand" weight="600" style={styles.quantityLabel}>
                    В корзине · {qty} шт
                  </AppText>
                  <SymbolView name="chevron.right" size={10} tintColor={colors.brand} weight="semibold" />
                </View>
                <Price price={totalKopecks} size="sm" />
              </PressableScale>
            ) : (
              <View style={[styles.info, stacked ? styles.stackedInfo : null]}>
                <Price
                  price={product.price}
                  oldPrice={product.oldPrice}
                  discountPercent={product.discountPercent}
                  size="sm"
                />
              </View>
            )}

            <View style={[styles.action, stacked ? styles.stackedAction : null]}>
              {!product.inStock ? (
                <Button
                  title="Нет в наличии"
                  size="md"
                  variant="secondary"
                  disabled
                  fullWidth={stacked}
                  accessibilityLabel="Нет в наличии"
                  accessibilityHint="Товар временно недоступен"
                />
              ) : qty > 0 ? (
                <Stepper
                  value={qty}
                  size="md"
                  onChange={(next) => setQty(product.id, next)}
                  onRemove={() => remove(product.id)}
                  style={stacked ? styles.stackedStepper : undefined}
                />
              ) : (
                <Button
                  title="В корзину"
                  size="md"
                  leftIcon="basket"
                  fullWidth={stacked}
                  haptic="none"
                  onPress={onAdd}
                  accessibilityLabel={`Добавить в корзину: ${product.name}`}
                />
              )}
            </View>
          </Animated.View>
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: spacing.sm, alignItems: "stretch" },
  flash: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    maxWidth: "100%",
  },
  // тень живёт на обёртке: у GlassSurface overflow:hidden, она бы её срезала
  shadow: { borderRadius: radii["2xl"] },
  glass: { borderRadius: radii["2xl"], padding: spacing.sm + 2 },
  note: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stacked: { flexDirection: "column", alignItems: "stretch" },
  info: { flex: 1, minWidth: 0, gap: 2, paddingLeft: spacing.sm },
  stackedInfo: { flex: 0 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  quantityLabel: { flexShrink: 1 },
  action: { flexShrink: 0 },
  stackedAction: { alignSelf: "stretch" },
  stackedStepper: { alignSelf: "stretch", justifyContent: "space-between" },
  flashText: { flexShrink: 1 },
});
