/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика/эффекта — штатный и единственный способ анимировать на UI-потоке.
 * Правило React Compiler про них не знает и даёт ложное срабатывание; в рендере
 * `.value` мы не читаем, поэтому компилятору эта мутация не мешает. */
import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { HeartBurst } from "@/components/fx/heart";
import { PressableScale } from "@/components/ui/press-scale";
import { useFavorites } from "@/hooks/use-favorites";
import { Duration, Ease, MIN_TAP_SIZE, radii, Spring, useColors } from "@/theme";

export interface FavoriteButtonProps {
  productId: string;
  /** Полупрозрачная подложка поверх фото товара. */
  onImage?: boolean;
  size?: number;
}

/**
 * Насколько сжимается сердечко под пальцем. Это первый такт «сердечного»
 * ритма (сжатие → перелёт → посадка), и отдаём мы его сразу на палец: состояние
 * избранного у авторизованного пользователя приходит с сервера и может
 * запоздать, а тактильный отклик опаздывать не имеет права.
 */
const SQUEEZE = 0.84;

/**
 * Сердечко на карточке.
 *
 * Контур и заливка — два независимых слоя, а не одна переключаемая иконка:
 * именно это даёт ощущение, что сердце *наполняется*. Заливка выезжает из
 * центра пружиной Spring.pop (перелёт ~10% — численный эквивалент GSAP
 * back.out(1.7)), контур в этот момент поджат пальцем и гасится под растущей
 * заливкой. Снятие из избранного не празднуем: заливка просто уходит вниз по
 * масштабу с power2.in, без кольца и без искр.
 *
 * Производительность: кнопка живёт в каждой ячейке FlashList, поэтому вся
 * анимация — shared values и worklets. Ни один кадр не зависит от ререндера,
 * подложка с тенью не масштабируется (иначе iOS пересчитывает тень каждый
 * кадр), а вспышка завёрнута в memo и запускается через shared value.
 */
export function FavoriteButton({ productId, onImage = true, size = 18 }: FavoriteButtonProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(productId);

  /** 0 — пусто, 1 — залито; пружина уводит выше 1 на перелёте. */
  const fill = useSharedValue(active ? 1 : 0);
  /** Сжатие под пальцем, общее для контура и заливки. */
  const squeeze = useSharedValue(1);
  /** Счётчик вспышек для HeartBurst. */
  const burstToken = useSharedValue(0);

  // Счётчик держим в ref, а не читаем из shared value: чтение `.value` с
  // JS-потока асинхронно и вернуло бы прошлое значение (док Reanimated).
  const burstCount = useRef(0);
  // Что мы уже отыграли: товар + состояние. Нужно из-за переиспользования
  // ячеек FlashList — в ту же вьюху приезжает другой товар.
  const played = useRef({ id: productId, active });

  useEffect(() => {
    const previous = played.current;
    played.current = { id: productId, active };

    // Ячейку переиспользовали под другой товар: ставим состояние мгновенно,
    // иначе соседняя карточка отпразднует чужой лайк.
    if (previous.id !== productId) {
      fill.value = active ? 1 : 0;
      squeeze.value = 1;
      return;
    }
    if (previous.active === active) return;

    if (reduced) {
      // Reduce Motion: короткий кросс-фейд состояния. Ни перелёта, ни искр —
      // но обратная связь остаётся (иконка меняется, хаптика на месте).
      fill.value = withTiming(active ? 1 : 0, { duration: Duration.instant, easing: Ease.linear });
      return;
    }

    if (active) {
      fill.value = withSpring(1, Spring.pop);
      burstCount.current += 1;
      burstToken.value = burstCount.current;
    } else {
      fill.value = withTiming(0, { duration: Duration.fast, easing: Ease.power2In });
    }
  }, [active, productId, reduced, fill, squeeze, burstToken]);

  const contourStyle = useAnimatedStyle(() => ({
    // При Reduce Motion — честный кросс-фейд; иначе контур уходит только тогда,
    // когда заливка его уже перекрыла, чтобы не мигала окантовка.
    opacity: reduced
      ? 1 - Math.min(fill.value, 1)
      : interpolate(fill.value, [0.4, 0.88], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: squeeze.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: reduced
      ? Math.min(fill.value, 1)
      : interpolate(fill.value, [0, 0.18], [0, 1], Extrapolation.CLAMP),
    // Ровный 0 в матрице трансформации на iOS невырожденной не бывает —
    // держим минимальный эпсилон, визуально это тот же ноль.
    transform: [{ scale: reduced ? 1 : Math.max(fill.value * squeeze.value, 0.001) }],
  }));

  return (
    <PressableScale
      // Единственная хаптика на действие приходит из useFavorites().toggle
      // (Light) — здесь её дублировать нельзя.
      haptic="none"
      onPressIn={() => {
        if (reduced) return;
        squeeze.value = withTiming(SQUEEZE, {
          duration: Duration.instant,
          easing: Ease.power2In,
        });
      }}
      onPressOut={() => {
        if (reduced) return;
        squeeze.value = withSpring(1, Spring.press);
      }}
      onPress={(event) => { event.stopPropagation(); toggle(productId); }}
      accessibilityRole="button"
      accessibilityLabel={active ? "Убрать из избранного" : "Добавить в избранное"}
      accessibilityState={{ selected: active }}
      style={styles.hit}
    >
      <Animated.View
        style={[
          styles.circle,
          onImage
            ? {
                backgroundColor: colors.surface,
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: 6,
              }
            : null,
        ]}
      >
        <Animated.View style={[styles.glyph, contourStyle]}>
          <SymbolView name="heart" size={size} tintColor={colors.textMuted} weight="medium" />
        </Animated.View>
        <Animated.View style={[styles.glyph, fillStyle]}>
          <SymbolView name="heart.fill" size={size} tintColor={colors.sale} weight="medium" />
        </Animated.View>
      </Animated.View>

      {/* Вспышка рисуется ПОВЕРХ подложки: под непрозрачным белым кружком
          кольцо было бы видно только последние три пункта радиуса. Сверху оно
          стартует толстым диском и, утончаясь, открывает уже залитое сердце —
          ровно тот порядок слоёв, что в системных «лайках» iOS. */}
      {reduced ? null : (
        <HeartBurst token={burstToken} color={colors.sale} size={Math.min(size * 2.8, 52)} />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hit: { width: MIN_TAP_SIZE, height: MIN_TAP_SIZE, alignItems: "center", justifyContent: "center" },
  circle: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  // Оба слоя занимают один и тот же бокс, поэтому центры глифов совпадают
  // до пикселя — иначе заливка «съезжала» бы относительно контура.
  glyph: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
