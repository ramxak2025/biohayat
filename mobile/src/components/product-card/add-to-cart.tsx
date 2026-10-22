/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика и эффекта — штатный и единственный способ анимировать на
 * UI-потоке. Правило React Compiler про shared values не знает и даёт ложное
 * срабатывание; в рендере `.value` мы не читаем. */
import { useCallback, useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import Animated, {
  Extrapolation,
  LinearTransition,
  interpolate,
  interpolateColor,
  useAnimatedRef,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { PressableScale } from "@/components/ui/press-scale";
import { Stepper } from "@/components/ui/stepper";
import { useFlyToCart } from "@/components/fx/flight";
import type { Product } from "@/api/types";
import { useCart } from "@/store/cart";
import { Duration, Ease, MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

export interface AddToCartProps {
  product: Product;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

/**
 * Высота пилюли по размерам. В плитке каталога она намеренно компактная (36 pt):
 * плотность сетки важнее крупной кнопки, а до положенных по HIG 44 pt зону
 * нажатия добирает hitSlop ниже — палец получает полный целевой размер, пиксели
 * карточки при этом не тратятся.
 */
const HEIGHT = { sm: 36, md: 48 } as const;

/** Сторона летящей копии: примерно половина картинки карточки в сетке. */
const FLY_SIZE = { sm: 60, md: 76 } as const;

/** Амплитуды «отказа» для товара не в наличии — затухающая тряска, как у iOS-пароля. */
const SHAKE = [-7, 6, -4, 2, 0] as const;

/**
 * «В корзину», которая морфится в счётчик.
 *
 * Два слоя лежат в одной пилюле: кнопка остаётся в потоке и задаёт размер,
 * счётчик лежит поверх абсолютно. Поэтому при переключении состояний НИЧЕГО не
 * пересчитывается — нет ни рывка ширины, ни прыжка соседей в сетке, а сам
 * переход — кросс-фейд + перекраска фона (brand → brandSoft).
 *
 * Момент добавления в стор сдвинут в приземление полёта: так «поп» бейджа на
 * таб-баре, хаптика и превращение кнопки в счётчик случаются одновременно, а не
 * тремя отдельными событиями.
 */
export function AddToCart({ product, size = "sm", style }: AddToCartProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const flyToCart = useFlyToCart();

  const line = useCart((state) => state.lines.find((item) => item.id === product.id));
  const add = useCart((state) => state.add);
  const setQty = useCart((state) => state.setQty);
  const remove = useCart((state) => state.remove);

  // измеряем именно пилюлю: она есть во всех раскладках карточки (сетка, строка),
  // поэтому один и тот же код работает везде
  const pill = useAnimatedRef<View>();

  const inCart = !!line;
  const morph = useSharedValue(inCart ? 1 : 0);
  const shake = useSharedValue(0);
  const dim = useSharedValue(1);

  useEffect(() => {
    morph.value = withTiming(inCart ? 1 : 0, {
      duration: reduced ? Duration.fast : Duration.base,
      // 0 → 1 через backOut: счётчик появляется с лёгким перелётом — это и есть
      // «поп». 1 → 0 без перелёта: исчезновение не должно праздновать.
      // Reduce Motion — линейный кросс-фейд без масштаба вовсе.
      easing: reduced ? Ease.linear : inCart ? Ease.backOut : Ease.power2InOut,
    });
  }, [inCart, reduced, morph]);

  // фон пилюли перекрашивается вместе с морфингом: brand → brandSoft
  const shellStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      // backOut перелетает за 1 — прогресс для цвета клампим, иначе
      // interpolateColor экстраполирует канал за пределы 0..255
      Math.min(Math.max(morph.value, 0), 1),
      [0, 1],
      [colors.brand, colors.brandSoft],
    ),
  }));

  // «отказ» для товара не в наличии: тряска, а при Reduce Motion — вспышка
  const refuseStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
    opacity: dim.value,
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
    transform: reduced
      ? []
      : [{ scale: interpolate(morph.value, [0, 1], [1, 0.92], Extrapolation.CLAMP) }],
  }));

  const counterStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0.35, 1], [0, 1], Extrapolation.CLAMP),
    // без CLAMP: перелёт backOut (до ~1.1) доезжает до масштаба и читается как «поп»
    transform: reduced ? [] : [{ scale: interpolate(morph.value, [0, 1], [0.86, 1]) }],
  }));

  const onAdd = useCallback(() => {
    flyToCart({
      source: pill,
      image: product.image,
      size: FLY_SIZE[size],
      onLand: () => {
        add(product, 1);
        // ровно одна хаптика на действие и именно notification-Success:
        // добавление — это результат, а не касание. Совпадает с бейджем таб-бара.
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  }, [add, flyToCart, pill, product, size]);

  const onUnavailable = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (reduced) {
      // Reduce Motion: перемещение заменяем затуханием — отказ всё равно виден
      dim.value = withSequence(
        withTiming(0.45, { duration: Duration.instant, easing: Ease.power2Out }),
        withTiming(1, { duration: Duration.fast, easing: Ease.power2Out }),
      );
      return;
    }
    shake.value = withSequence(
      withTiming(SHAKE[0], { duration: 55, easing: Ease.power2Out }),
      withTiming(SHAKE[1], { duration: 55, easing: Ease.power2InOut }),
      withTiming(SHAKE[2], { duration: 50, easing: Ease.power2InOut }),
      withTiming(SHAKE[3], { duration: 45, easing: Ease.power2InOut }),
      withTiming(SHAKE[4], { duration: 45, easing: Ease.power2Out }),
    );
  }, [reduced, shake, dim]);

  /** Добор зоны нажатия до 44 pt сверху и снизу — пилюля ниже целевого размера. */
  const slop = Math.max((MIN_TAP_SIZE - HEIGHT[size]) / 2, 0);
  const tapSlop = { top: slop, bottom: slop, left: 0, right: 0 };

  if (!product.inStock) {
    return (
      <Animated.View
        style={[
          styles.shell,
          { height: HEIGHT[size], backgroundColor: colors.surfaceSunken },
          refuseStyle,
          style,
        ]}
      >
        {/* не просто disabled: на попытку нажать отвечаем тряской и Warning —
            «нельзя» должно быть слышно и видно, а не просто не работать */}
        <PressableScale
          haptic="none"
          onPress={(event) => { event.stopPropagation(); onUnavailable(); }}
          accessibilityRole="button"
          accessibilityLabel={`Нет в наличии: ${product.name}`}
          accessibilityHint="Товар временно недоступен"
          hitSlop={tapSlop}
          style={[styles.cta, { height: HEIGHT[size] }]}
        >
          <AppText variant="subhead" color="faint" weight="600" numberOfLines={1} maxScale={1.4}>
            Нет в наличии
          </AppText>
        </PressableScale>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      ref={pill}
      // без collapsable={false} RN схлопнет обёртку и measure() вернёт null —
      // полёту неоткуда будет стартовать
      collapsable={false}
      layout={reduced ? undefined : LinearTransition.duration(Duration.base).easing(Ease.power2InOut)}
      style={[styles.shell, { height: HEIGHT[size] }, shellStyle, style]}
    >
      <Animated.View
        style={ctaStyle}
        pointerEvents={inCart ? "none" : "auto"}
        accessibilityElementsHidden={inCart}
        importantForAccessibility={inCart ? "no-hide-descendants" : "auto"}
      >
        <PressableScale
          haptic="none"
          onPress={(event) => { event.stopPropagation(); onAdd(); }}
          accessibilityRole="button"
          accessibilityLabel={`Добавить в корзину: ${product.name}`}
          hitSlop={tapSlop}
          style={[styles.cta, { height: HEIGHT[size], backgroundColor: colors.brand }]}
        >
          <SymbolView
            name="basket"
            size={size === "md" ? 17 : 15}
            tintColor={colors.textOnBrand}
            weight="semibold"
          />
          <AppText
            variant="subhead"
            weight="600"
            numberOfLines={1}
            maxScale={1.4}
            style={{ color: colors.textOnBrand }}
          >
            В корзину
          </AppText>
        </PressableScale>
      </Animated.View>

      <Animated.View
        style={[styles.counter, counterStyle]}
        pointerEvents={inCart ? "auto" : "none"}
        accessibilityElementsHidden={!inCart}
        importantForAccessibility={inCart ? "auto" : "no-hide-descendants"}
      >
        <Stepper
          value={line?.qty ?? 1}
          size={size === "md" ? "md" : "sm"}
          onChange={(next) => setQty(product.id, next)}
          onRemove={() => remove(product.id)}
          style={styles.stepper}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: radii.pill, overflow: "hidden", justifyContent: "center" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm - 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  counter: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "center" },
  stepper: { alignSelf: "stretch", justifyContent: "space-between" },
});
