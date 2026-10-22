/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика скролла — штатный и единственный способ анимировать на UI-потоке.
 * Правило React Compiler про shared values не знает и даёт ложное срабатывание. */
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { ProductImage } from "@/api/types";
import { AppText } from "@/components/ui";
import { Duration, Ease, radii, spacing, useColors } from "@/theme";

/**
 * Нейтральная размытая заглушка, пока грузится фото: expo-image показывает её
 * вместо мигания пустым прямоугольником. Конкретный хеш не важен — важно, что
 * это мягкое серо-зелёное пятно в тон поверхности.
 */
const BLURHASH = "L6Pj0^jE.AyE_3t7t7R**0o#DgR4";

/**
 * Доля ширины, на которую фото отстаёт от своей страницы при листании.
 * 0.25 — предел, после которого кадр заметно «плавает» внутри рамки.
 */
const SLIDE_PARALLAX = 0.25;

const DOT_SIZE = 6;
const DOT_PILL = 18;

export interface ProductGalleryProps {
  images: ProductImage[];
  name: string;
  /** Ширина экрана: страница пагинации равна ей ровно, иначе paging «плывёт». */
  width: number;
  height: number;
  /** Reduce Motion: параллакс выключаем, галерея остаётся обычной. */
  reducedMotion?: boolean;
  onOpenImage?: (index: number) => void;
}

/** Вписанные фотографии в спокойной панели: листание, счётчик и просмотр на весь экран. */
export function ProductGallery({
  images,
  name,
  width,
  height,
  reducedMotion = false,
  onOpenImage,
}: ProductGalleryProps) {
  const colors = useColors();
  const page = useSharedValue(0);
  /** Номер текущего фото для счётчика. Меняется раз в страницу, не раз в кадр. */
  const [current, setCurrent] = useState(0);

  const onPageScroll = useAnimatedScrollHandler((event) => {
    page.value = width > 0 ? event.contentOffset.x / width : 0;
  });

  // Единственное место, где положение ленты попадает в React: округлённая
  // страница меняется один раз за перелистывание, поэтому счётчик не стоит
  // приложению ни одного лишнего ререндера во время жеста.
  useAnimatedReaction(
    () => Math.round(page.value),
    (value, previous) => {
      if (value === previous) return;
      const last = Math.max(0, images.length - 1);
      scheduleOnRN(setCurrent, Math.min(Math.max(value, 0), last));
    },
    [images.length],
  );

  const placeholder = (
    <View style={[styles.placeholder, { backgroundColor: colors.brandSoft }]}>
      <Image source={require("../../../assets/brand/logo-mark.png")} style={{ width: 48, height: 48 }} contentFit="contain" accessible={false} />
      <AppText variant="footnote" color="faint">
        Фото пока нет
      </AppText>
    </View>
  );

  return (
    <View style={[styles.frame, { height, backgroundColor: colors.surface }]}>
      <Animated.View style={StyleSheet.absoluteFill}>
        {images.length === 0 ? (
          placeholder
        ) : (
          <Animated.ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onPageScroll}
            scrollEventThrottle={16}
            style={StyleSheet.absoluteFill}
          >
            {images.map((image, index) => (
              <Slide
                key={`${image.url}-${index}`}
                image={image}
                index={index}
                count={images.length}
                name={name}
                page={page}
                width={width}
                height={height}
                reducedMotion={reducedMotion}
                onPress={onOpenImage}
              />
            ))}
          </Animated.ScrollView>
        )}
      </Animated.View>

      {images.length > 0 ? <View style={styles.zoomHint} pointerEvents="none" accessibilityElementsHidden>
        <SymbolView name={{ ios: "arrow.up.left.and.arrow.down.right", android: "open_in_full", web: "open_in_full" }} size={12} tintColor={colors.textMuted} />
        <AppText variant="caption" color="muted">Увеличить</AppText>
      </View> : null}
      {images.length > 1 ? (
        <>
          {/* «2/5» в углу: сколько всего фото, видно не начав листать */}
          <View
            style={[styles.counter, { backgroundColor: colors.surfaceSunken }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <AppText variant="caption" weight="700" color="muted" maxScale={1.2}>
              {`${Math.min(current + 1, images.length)}/${images.length}`}
            </AppText>
          </View>

          <View
            style={[styles.dots, { backgroundColor: colors.surfaceSunken }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {images.map((image, index) => (
              <Dot
                key={`dot-${image.url}-${index}`}
                index={index}
                page={page}
                active={colors.brand}
                inactive={colors.textFaint}
                reducedMotion={reducedMotion}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

interface SlideProps {
  image: ProductImage;
  index: number;
  count: number;
  name: string;
  /** Позиция ленты в страницах: 1.5 — ровно между вторым и третьим фото. */
  page: SharedValue<number>;
  width: number;
  height: number;
  reducedMotion: boolean;
  onPress?: (index: number) => void;
}

/**
 * Страница галереи. Фото внутри неё отстаёт от листания на четверть ширины:
 * соседний кадр выезжает медленнее собственной страницы, и между слайдами
 * появляется глубина. Считаем от общего `page`, поэтому и сдвиг, и затемнение
 * живут на UI-потоке — ни одного ререндера за жест.
 *
 * Сдвиг применяется только внутри горизонтальной страницы; сама панель
 * не растягивается и не движется относительно вертикального содержимого.
 */
function Slide({
  image,
  index,
  count,
  name,
  page,
  width,
  height,
  reducedMotion,
  onPress,
}: SlideProps) {
  const [failed, setFailed] = useState(false);
  const slide = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 1, transform: [{ translateX: 0 }] };
    const offset = page.value - index;
    return {
      // Уходящий кадр слегка гаснет: глубина, которая не читается как затемнение.
      opacity: interpolate(Math.abs(offset), [0, 1], [1, 0.85], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(
            offset,
            [-1, 0, 1],
            [-width * SLIDE_PARALLAX, 0, width * SLIDE_PARALLAX],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Pressable
      onPress={() => onPress?.(index)}
      accessibilityRole="imagebutton"
      accessibilityLabel={`Фото ${index + 1} из ${count}: ${name}`}
      accessibilityHint="Открыть на весь экран"
      // Клиппинг страницы: сдвинутое фото не должно заползать на соседнюю.
      style={[styles.page, { width, height }]}
    >
      <Animated.View style={[styles.slide, slide]}>
        {failed ? (
          <View style={styles.placeholder}>
            <SymbolView name={{ ios: "photo", android: "image_not_supported", web: "image_not_supported" }} size={32} />
            <AppText variant="footnote" color="muted">Не удалось загрузить фото</AppText>
          </View>
        ) : <Image
          source={{ uri: image.url }}
          style={styles.image}
          contentFit="contain"
          transition={260}
          placeholder={{ blurhash: BLURHASH }}
          placeholderContentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={image.url}
          accessibilityIgnoresInvertColors
          alt={image.alt ?? name}
          onError={() => setFailed(true)}
        />}
      </Animated.View>
    </Pressable>
  );
}

interface DotProps {
  index: number;
  page: SharedValue<number>;
  active: string;
  inactive: string;
  reducedMotion: boolean;
}

/**
 * Точка пагинации. Активность берётся из округлённого `page` — состояние React
 * в скролле не участвует вовсе. Ширину ведёт один тайминг: пилюля растягивается
 * ровно и не дёргается вслед за пальцем, а соседние точки сжимаются и бледнеют.
 */
function Dot({ index, page, active, inactive, reducedMotion }: DotProps) {
  const progress = useDerivedValue(() => {
    const target = Math.round(page.value) === index ? 1 : 0;
    return reducedMotion
      ? target
      : withTiming(target, { duration: Duration.fast, easing: Ease.power2Out });
  });

  const style = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [DOT_SIZE, DOT_PILL]),
    opacity: interpolate(progress.value, [0, 1], [0.45, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.78, 1]) }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [inactive, active]),
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  frame: { width: "100%", borderRadius: radii.xl, overflow: "hidden" },
  page: { overflow: "hidden" },
  slide: { flex: 1 },
  image: { flex: 1, margin: spacing.lg },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  zoomHint: { position: "absolute", left: spacing.md, bottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dots: {
    position: "absolute",
    alignSelf: "center",
    bottom: spacing.base,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.pill,
  },
  dot: { height: DOT_SIZE, borderRadius: radii.pill },
  counter: {
    position: "absolute",
    right: spacing.base,
    bottom: spacing.base,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
});
