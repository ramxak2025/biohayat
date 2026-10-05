/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика скролла — штатный способ передать позицию на UI-поток. Правило
 * React Compiler про shared values не знает и даёт ложное срабатывание. */
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import type { Banner } from "@/api/types";
import { AppText, PressableScale } from "@/components/ui";
import { palette, radii, spacing, useColors } from "@/theme";

import { bannerGradient, DEFAULT_BANNER_COLOR, inkOn, tint, withAlpha } from "./banner-color";

/**
 * Герой главной — витрина во весь верх экрана.
 *
 * Он НЕ карточка: картинка идёт от края до края и уходит под статус-бар, как в
 * Apple Music и App Store. Системной шапки над ним нет вовсе (её прячет экран),
 * логотип и кнопки лежат поверх — см. `HomeChroma`. Снизу картинка не
 * обрывается кромкой, а растворяется в фоне экрана: контент «вытекает» из
 * фотографии, и стык героя с первой секцией не читается как шов.
 *
 * Про устройство параллакса. Двигается ТОЛЬКО фотография внутри слайда, сама
 * рамка героя стоит на месте. Это принципиально: если ехать всем героем, его
 * нижнее растворение уползает от кромки контента — и ровно посреди экрана
 * появляется горизонтальный шов «фото / фон». Единственное исключение —
 * оттяжка вниз: там контента над героем нет, и ехать можно целиком.
 */

export interface HeroCarouselProps {
  banners: Banner[];
  isLoading?: boolean;
  onPressBanner: (banner: Banner) => void;
  /** Куда ведёт запасной герой, когда баннеров нет. */
  onOpenCatalog: () => void;
  /** Вертикальное смещение экрана — источник параллакса и «резинки». */
  scrollY: SharedValue<number>;
}

/**
 * Доля экрана под герой. 55 % — витрина занимает верх целиком, но снизу видна
 * кромка первой секции: она и приглашает скроллить.
 */
const HERO_RATIO = 0.55;
/** Пол и потолок: на SE 55 % — это мало, на Pro Max — уже слишком много. */
const HERO_MIN = 340;
const HERO_MAX = 560;

/** Насколько фотография отстаёт от экрана при скролле (0 — едет вместе с ним). */
const PARALLAX = 0.3;
/** Доля героя, отданная растворению в фон экрана. */
const FADE_RATIO = 0.3;

/**
 * Высота героя. Хук, а не константа: её знает и экран (чтобы сказать хроме, где
 * переключаться), и сам герой. Считается из размеров окна, поэтому чистый.
 */
export function useHeroHeight(): number {
  const { height } = useWindowDimensions();
  return Math.round(Math.min(HERO_MAX, Math.max(HERO_MIN, height * HERO_RATIO)));
}

export function HeroCarousel({
  banners,
  isLoading,
  onPressBanner,
  onOpenCatalog,
  scrollY,
}: HeroCarouselProps) {
  const { width } = useWindowDimensions();
  const colors = useColors();
  const reduced = useReducedMotion();
  const height = useHeroHeight();

  // зона растворения в фон экрана; текст слайда живёт ВЫШЕ неё, иначе светлая
  // надпись оказалась бы на светлом фоне и пропала
  const fade = Math.round(height * FADE_RATIO);

  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    x.value = event.contentOffset.x;
  });

  const stage = useAnimatedStyle(() => {
    if (reduced) return {};
    const y = scrollY.value;
    if (y >= 0) return {};

    // Оттяжка вниз. Зазор над героем равен |y|; закрываем его ростом картинки,
    // а не растяжкой: scale вокруг центра даёт |y|/2 сверху, ещё |y|/2 добираем
    // сдвигом. Нижняя кромка при этом остаётся ровно на месте — растворение в
    // фон по-прежнему совпадает с началом контента.
    return { transform: [{ translateY: y / 2 }, { scale: 1 - y / height }] };
  });

  const depth = useAnimatedStyle(() => {
    if (reduced) return {};
    return {
      opacity: interpolate(scrollY.value, [0, height * 0.85], [0, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View style={[{ height }, stage]}>
      {banners.length === 0 ? (
        // Баннеров нет (пусто, 404 на старом сервере или ошибка сети) — вместо
        // дырки показываем фирменный экран с кнопкой в каталог.
        <HeroFallback
          height={height}
          fade={fade}
          loading={!!isLoading}
          reduced={reduced}
          scrollY={scrollY}
          onPress={onOpenCatalog}
        />
      ) : (
        <Animated.ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          scrollEnabled={banners.length > 1}
          style={StyleSheet.absoluteFill}
        >
          {banners.map((banner, index) => (
            <HeroSlide
              key={banner.id}
              banner={banner}
              index={index}
              x={x}
              scrollY={scrollY}
              width={width}
              height={height}
              fade={fade}
              reduced={reduced}
              onPress={onPressBanner}
            />
          ))}
        </Animated.ScrollView>
      )}

      {/* Уходя вверх, герой не просто прячется за край, а темнеет — появляется
          ощущение слоя, лежащего ПОД контентом. Затемнение сходит на нет ровно
          в зоне растворения, иначе на её месте проступила бы тёмная полоса.
          Цвет фотографический, не из темы: он лежит на кадре, а не на
          поверхности приложения, и тёмным нужен в обеих темах. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.hidden, depth]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[withAlpha(palette.ink, 0.55), withAlpha(palette.ink, 0.55), withAlpha(palette.ink, 0)]}
          locations={[0, 1 - FADE_RATIO, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Растворение в фон экрана — общее для всех слайдов и неподвижное:
          его нижняя кромка обязана совпадать с началом контента. */}
      <LinearGradient
        colors={[
          withAlpha(colors.background, 0),
          withAlpha(colors.background, 0.72),
          colors.background,
        ]}
        locations={[0, 0.58, 1]}
        style={[styles.fade, { height: fade }]}
        pointerEvents="none"
      />

      {banners.length > 1 ? <Dots count={banners.length} x={x} interval={width} /> : null}
    </Animated.View>
  );
}

interface HeroSlideProps {
  banner: Banner;
  index: number;
  x: SharedValue<number>;
  scrollY: SharedValue<number>;
  width: number;
  height: number;
  fade: number;
  reduced: boolean;
  onPress: (banner: Banner) => void;
}

function HeroSlide({
  banner,
  index,
  x,
  scrollY,
  width,
  height,
  fade,
  reduced,
  onPress,
}: HeroSlideProps) {
  const background = banner.bgColor ?? DEFAULT_BANNER_COLOR;
  const ink = inkOn(background);
  const photo = banner.imageMobile ?? banner.image;

  // запас сверху, из которого картинка «выезжает» при вертикальном параллаксе
  const drift = Math.round(height * PARALLAX);

  const layerStyle = useAnimatedStyle(() => {
    if (reduced) return {};
    const offset = x.value - index * width;
    return {
      transform: [
        {
          translateX: interpolate(
            offset,
            [-width, 0, width],
            [-width * 0.08, 0, width * 0.08],
            Extrapolation.CLAMP,
          ),
        },
        {
          // вниз — только при скролле вверх: оттяжку отрабатывает весь герой
          translateY: interpolate(scrollY.value, [0, height], [0, drift], Extrapolation.CLAMP),
        },
        { scale: 1.18 },
      ],
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    if (reduced) return {};
    const offset = x.value - index * width;
    return {
      opacity: interpolate(Math.abs(offset), [0, width * 0.7], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(
            offset,
            [-width, 0, width],
            [width * 0.18, 0, -width * 0.18],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const label = [banner.title, banner.subtitle, banner.ctaLabel].filter(Boolean).join(". ");

  return (
    <PressableScale
      onPress={() => onPress(banner)}
      disabled={!banner.link}
      haptic={banner.link ? "light" : "none"}
      // герой во весь экран нельзя жать «как кнопку»: 0.965 на таком размере
      // читается как рывок всего экрана
      scale={0.985}
      accessibilityRole={banner.link ? "button" : "image"}
      accessibilityLabel={label}
      // фон под картинкой: пока она едет, из-под неё не должно сквозить чёрным
      style={[styles.slide, { width, height, backgroundColor: background }]}
    >
      <Animated.View style={[styles.photo, { top: -drift, height: height + drift }, layerStyle]}>
        <LinearGradient
          colors={bannerGradient(background)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={280}
            cachePolicy="memory-disk"
            recyclingKey={banner.id}
            accessibilityIgnoresInvertColors
            alt={banner.title}
          />
        ) : null}

        {/* без фотографии заливка плоская — блик и водяной знак дают ей объём.
            Живут ВНУТРИ едущего слоя: иначе на баннерах без фото (а демо-сервер
            отдаёт именно такие) параллакса не было бы видно вовсе. */}
        {photo ? null : (
          <HeroWatermark color={background} ink={ink} height={height} offsetTop={drift} />
        )}
      </Animated.View>

      {/* подложка под текст: на фотографии он иначе теряется в светлых пятнах */}
      {photo ? (
        <LinearGradient
          colors={[withAlpha(palette.ink, 0), withAlpha(palette.ink, 0.62)]}
          style={[styles.textScrim, { height: fade + Math.round(height * 0.3) }]}
          pointerEvents="none"
        />
      ) : null}

      <Animated.View
        style={[styles.content, { paddingBottom: fade + spacing.sm }, contentStyle]}
        pointerEvents="none"
      >
        <AppText variant="title1" numberOfLines={2} style={{ color: ink }}>
          {banner.title}
        </AppText>

        {banner.subtitle ? (
          <AppText variant="subhead" numberOfLines={2} style={[styles.subtitle, { color: ink }]}>
            {banner.subtitle}
          </AppText>
        ) : null}

        {banner.ctaLabel && banner.link ? (
          <HeroCta label={banner.ctaLabel} ink={ink} background={background} />
        ) : null}
      </Animated.View>
    </PressableScale>
  );
}

interface HeroFallbackProps {
  height: number;
  fade: number;
  loading: boolean;
  reduced: boolean;
  scrollY: SharedValue<number>;
  onPress: () => void;
}

/**
 * Запасной герой: фирменный градиент вместо пустоты.
 *
 * Работает и как состояние загрузки, и как состояние «баннеров нет». Высота
 * та же, что у настоящего героя, поэтому при появлении данных ничего не
 * прыгает. Без баннеров пользователь всё равно должен попасть в товары —
 * отсюда кнопка «В каталог».
 */
function HeroFallback({ height, fade, loading, reduced, scrollY, onPress }: HeroFallbackProps) {
  const ink = inkOn(DEFAULT_BANNER_COLOR);
  const drift = Math.round(height * PARALLAX);

  const layerStyle = useAnimatedStyle(() => {
    if (reduced) return {};
    return {
      transform: [
        { translateY: interpolate(scrollY.value, [0, height], [0, drift], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.slide, { backgroundColor: DEFAULT_BANNER_COLOR }]}>
      <Animated.View style={[styles.photo, { top: -drift, height: height + drift }, layerStyle]}>
        <LinearGradient
          colors={bannerGradient(DEFAULT_BANNER_COLOR)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <HeroWatermark color={DEFAULT_BANNER_COLOR} ink={ink} height={height} offsetTop={drift} />
      </Animated.View>

      <View style={[styles.content, { paddingBottom: fade + spacing.sm }]}>
        <AppText variant="caption2" style={[styles.kicker, { color: ink }]}>
          ХАЯТ
        </AppText>
        <AppText variant="title1" numberOfLines={2} style={{ color: ink }}>
          Витамины и добавки для каждого дня
        </AppText>

        {/* Пока баннеры грузятся, показываем ровно столько же экрана, сколько
            он займёт потом: серый скелетон на брендовом градиенте читался бы
            как поломка, а подпись с кнопкой, исчезающие через секунду, —
            как прыжок вёрстки. */}
        {loading ? null : (
          <>
            <AppText variant="subhead" numberOfLines={2} style={[styles.subtitle, { color: ink }]}>
              Подберём курс под возраст, цель и образ жизни
            </AppText>
            <HeroCta
              label="В каталог"
              ink={ink}
              background={DEFAULT_BANNER_COLOR}
              onPress={onPress}
            />
          </>
        )}
      </View>
    </View>
  );
}

interface HeroWatermarkProps {
  color: string;
  ink: string;
  height: number;
  /** На сколько слой приподнят над рамкой слайда — блик считаем от её верха. */
  offsetTop: number;
}

/** Блик и лист: они дают объём плоской заливке, когда фотографии нет. */
function HeroWatermark({ color, ink, height, offsetTop }: HeroWatermarkProps) {
  const mark = Math.round(height * 0.5);
  return (
    <>
      <View
        style={[styles.glow, { top: offsetTop - 100, backgroundColor: tint(color, 0.45) }]}
        pointerEvents="none"
      />
      <SymbolView
        name="leaf.fill"
        size={mark}
        tintColor={ink}
        resizeMode="scaleAspectFit"
        // размеры задаём явно: у абсолютно позиционированного символа нет
        // собственной ширины, и Yoga схлопнул бы его в ноль
        style={[styles.watermark, { width: mark, height: mark }]}
      />
    </>
  );
}

interface HeroCtaProps {
  label: string;
  /** Контрастный цвет поверх заливки баннера — он же фон пилюли. */
  ink: string;
  background: string;
  /** Есть только у запасного героя: у слайда нажимается вся площадь. */
  onPress?: () => void;
}

function HeroCta({ label, ink, background, onPress }: HeroCtaProps) {
  const body = (
    <>
      <AppText variant="subhead" weight="700" maxScale={1.3} style={{ color: background }}>
        {label}
      </AppText>
      <SymbolView name="arrow.right" size={13} tintColor={background} weight="semibold" />
    </>
  );

  if (!onPress) {
    return <View style={[styles.cta, { backgroundColor: ink }]}>{body}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.cta, { backgroundColor: ink }]}
    >
      {body}
    </PressableScale>
  );
}

interface DotsProps {
  count: number;
  x: SharedValue<number>;
  interval: number;
}

/** Индикатор страниц живёт в растворённой полосе — на фоне экрана, не на фото. */
function Dots({ count, x, interval }: DotsProps) {
  return (
    <View
      style={styles.dots}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} x={x} interval={interval} />
      ))}
    </View>
  );
}

function Dot({ index, x, interval }: { index: number; x: SharedValue<number>; interval: number }) {
  const colors = useColors();

  const style = useAnimatedStyle(() => {
    const distance = Math.abs(x.value - index * interval);
    return {
      width: interpolate(distance, [0, interval], [22, 6], Extrapolation.CLAMP),
      opacity: interpolate(distance, [0, interval], [1, 0.28], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[styles.dot, { backgroundColor: colors.brand }, style]} />;
}

const styles = StyleSheet.create({
  // база для анимированной прозрачности: при Reduce Motion слой так и остаётся скрыт
  hidden: { opacity: 0 },
  // слайд обрезает картинку: вертикальный параллакс двигает её внутри рамки
  slide: { overflow: "hidden" },
  photo: { position: "absolute", left: 0, right: 0 },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0 },
  textScrim: { position: "absolute", left: 0, right: 0, bottom: 0 },
  glow: {
    position: "absolute",
    right: -80,
    width: 300,
    height: 300,
    borderRadius: radii.pill,
    opacity: 0.35,
  },
  watermark: { position: "absolute", right: -24, bottom: 0, opacity: 0.12 },
  content: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  kicker: { letterSpacing: 1.6, opacity: 0.8, marginBottom: spacing.xs },
  subtitle: { opacity: 0.9 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.base,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: spacing.base,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  dot: { height: 6, borderRadius: radii.pill },
});
