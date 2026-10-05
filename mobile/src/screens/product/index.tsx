/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика скролла — штатный способ анимировать на UI-потоке. Правило
 * React Compiler про shared values не знает и даёт ложное срабатывание. */
import { useCallback, useState } from "react";
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { Stack, useRouter, type Href } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useQuery } from "@tanstack/react-query";
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { Product } from "@/api/types";
import {
  AccordionSection,
  ImageViewer,
  ProductAssurance,
  ProductBuyBar,
  ProductGallery,
  ProductPriceBlock,
  ProductScreenSkeleton,
  ProductSpecs,
  ProductTrackerCard,
  hasProductSpecs,
} from "@/components/product";
import { FlyToCartProvider } from "@/components/fx/flight";
import { FavoriteButton, ProductStrip } from "@/components/product-card";
import {
  AppText,
  BadDisclaimer,
  Badge,
  ErrorState,
  IconButton,
  PressableScale,
  Screen,
  SectionHeader,
  useDetailScreenOptions,
  useTabBarInset,
} from "@/components/ui";
import { Duration, Ease, HIT_SLOP, spacing, staggerDelay, useColors } from "@/theme";

import { shareProduct } from "./share-product";

/** Максимальная высота героя: на больших экранах квадрат 1:1 съедает весь первый экран. */
const HERO_MAX_HEIGHT = 420;
/** Без фото герой делаем ниже: заглушка на пол-экрана выглядит как ошибка загрузки. */
const HERO_EMPTY_HEIGHT = 240;

/**
 * Где панель покупки начинает и заканчивает выезжать — в долях высоты героя.
 * Пока цена видна в контенте, дублировать её в панели незачем: она подъезжает
 * ровно тогда, когда блок с ценой начинает уходить за верхний край.
 */
const BAR_REVEAL_FROM = 0.35;
const BAR_REVEAL_TO = 0.8;

interface TextSection {
  key: string;
  title: string;
  icon: SFSymbol;
  text: string;
}

/**
 * Карточка товара. Порядок блоков перенесён из Wildberries — не ради копирования
 * чужого стиля (палитра, шрифты и логотип у нас свои), а потому что покупатель
 * приходит к нам с готовой привычкой искать информацию именно в этом порядке:
 *
 *   фото → ЦЕНА → название → характеристики → описание → похожие → кнопка внизу.
 *
 * Отсюда главное отличие от прошлой версии экрана: цена стоит ДО названия.
 * Чего у WB есть, а у нас честно нет (рейтингов, отзывов, остатков, сроков и
 * способов доставки, продавцов) — того нет и на экране: этих полей нет в API,
 * а заглушки на карточке товара — это враньё покупателю.
 */
export function ProductScreen({ slug }: { slug: string }) {
  const colors = useColors();
  const router = useRouter();
  const reduced = useReducedMotion();
  const { width, height: windowHeight } = useWindowDimensions();
  const tabInset = useTabBarInset();
  const detailOptions = useDetailScreenOptions();

  const fullHeroHeight = Math.min(width, HERO_MAX_HEIGHT);
  const [buyBarHeight, setBuyBarHeight] = useState(0);
  const onBuyBarLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.ceil(event.nativeEvent.layout.height);
    setBuyBarHeight((previous) => previous === height ? previous : height);
  }, []);
  const buyBarBottom = tabInset + spacing.sm;

  const scrollY = useSharedValue(0);
  /** Из этой вью вылетает копия товара при добавлении в корзину. */
  const heroRef = useAnimatedRef<View>();
  // при Reduce Motion панель просто есть с самого начала: выезда нет, но и без
  // кнопки покупки пользователь не остаётся
  const barReveal = useSharedValue(reduced ? 1 : 0);

  const onScroll = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y;
    scrollY.value = y;
    if (reduced) return;

    const from = fullHeroHeight * BAR_REVEAL_FROM;
    const to = fullHeroHeight * BAR_REVEAL_TO;
    const progress = Math.min(1, Math.max(0, (y - from) / (to - from)));
    // Панель едет 1:1 с пальцем — HIG прямо советует привязывать движение к
    // жесту, а не проигрывать его «в ответ». Но только вверх: один раз
    // показавшись, она больше не прячется, иначе пользователь, вернувшийся к
    // фотографиям, терял бы кнопку покупки.
    if (progress > barReveal.value) barReveal.value = progress;
  });

  const onContentSize = useCallback(
    (_width: number, contentHeight: number) => {
      // Короткая карточка товара (нет фото, нет описания, нет похожих) может не
      // прокручиваться настолько, чтобы панель успела выехать — тогда кнопка
      // покупки была бы недостижима. В этом случае показываем её сами.
      if (contentHeight - windowHeight >= fullHeroHeight * BAR_REVEAL_TO) return;
      barReveal.value = withTiming(1, { duration: Duration.reveal, easing: Ease.power3Out });
    },
    [barReveal, fullHeroHeight, windowHeight],
  );

  const barStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          barReveal.value,
          [0, 1],
          [buyBarBottom + buyBarHeight, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
    // короткое проявление в начале пути: стекло не должно «всплывать» из ничего
    opacity: interpolate(barReveal.value, [0, 0.35], [0, 1], Extrapolation.CLAMP),
  }));

  /* Индекс держим и после закрытия: если обнулять его, Modal размонтируется
   * раньше своей анимации и просмотр будет «схлопываться» рывком. */
  const [viewer, setViewer] = useState<{ index: number; visible: boolean }>({
    index: 0,
    visible: false,
  });

  // slug приходит из маршрута; пустой возможен только при битой ссылке
  const hasSlug = typeof slug === "string" && slug.length > 0;

  const productQuery = useQuery({
    queryKey: qk.product(slug),
    queryFn: ({ signal }) => api.catalog.product(slug, signal),
    enabled: hasSlug,
  });

  const relatedQuery = useQuery({
    queryKey: qk.related(slug),
    queryFn: ({ signal }) => api.catalog.related(slug, 8, signal),
    enabled: hasSlug,
  });

  if (hasSlug && productQuery.isPending) {
    return (
      <>
        <Stack.Screen options={{ ...detailOptions, title: "Товар" }} />
        <ProductScreenSkeleton heroHeight={fullHeroHeight} />
      </>
    );
  }

  const product: Product | undefined = productQuery.data;

  if (!product) {
    return (
      <>
        <Stack.Screen options={{ ...detailOptions, title: "Товар" }} />
        <Screen contentContainerStyle={styles.center}>
          <ErrorState
            error={productQuery.error}
            onRetry={hasSlug ? () => void productQuery.refetch() : undefined}
            title={hasSlug ? "Не удалось загрузить товар" : "Товар не найден"}
          />
        </Screen>
      </>
    );
  }

  const allSections: TextSection[] = [
    { key: "description", title: "Описание", icon: "text.alignleft", text: product.description ?? "" },
    { key: "composition", title: "Состав", icon: "leaf", text: product.composition ?? "" },
    { key: "usage", title: "Способ применения", icon: "clock", text: product.usage ?? "" },
    {
      key: "contraindications",
      title: "Противопоказания",
      icon: "exclamationmark.triangle",
      text: product.contraindications ?? "",
    },
  ];
  // пустые поля админка отдаёт как null/"" — такие секции просто не рисуем
  const sections = allSections.filter((section) => section.text.trim().length > 0);

  const heroHeight = product.images.length > 0 ? fullHeroHeight : HERO_EMPTY_HEIGHT;

  const related = relatedQuery.data ?? [];
  const showRelated = relatedQuery.isPending || related.length > 0;

  const reveal = (index: number) =>
    reduced
      ? undefined
      : FadeInDown.delay(staggerDelay(index, 45)).duration(Duration.reveal).easing(Ease.power3Out);

  return (
    // Оверлей полёта живёт выше контента экрана: копия товара должна
    // пролетать над скроллом и над панелью покупки, ничего не перехватывая.
    // В корневом layout провайдер можно поставить один раз на всё приложение.
    <FlyToCartProvider>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            ...detailOptions,
            title: product.name,
            // «Поделиться» в шапке — там же, где его ищут в WB и в системных
            // приложениях iOS. Уходит ссылка на товар на сайте.
            headerRight: () => (
              <IconButton
                name="square.and.arrow.up"
                label="Поделиться товаром"
                color={colors.brand}
                size={19}
                onPress={() => void shareProduct(product)}
              />
            ),
          }}
        />

        <Animated.ScrollView
          onScroll={onScroll}
          onContentSizeChange={onContentSize}
          scrollEventThrottle={16}
          /* "never", а не "automatic": при автоматическом инсете стартовый
           * contentOffset.y отрицателен на высоту бара, и параллакс героя начинался
           * бы уже увеличенным. Инсет таб-бара поэтому добавляем сами — ниже. */
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingBottom: buyBarBottom + buyBarHeight + spacing.base }}
        >
          {/* 1. Галерея во всю ширину: счётчик «2/5», точки, тап — полный экран */}
          <Animated.View ref={heroRef} collapsable={false}>
            <ProductGallery
              images={product.images}
              name={product.name}
              width={width}
              height={heroHeight}
              scrollY={scrollY}
              reducedMotion={reduced}
              onOpenImage={(index) => setViewer({ index, visible: true })}
            />

            {product.discountPercent ? (
              <View style={styles.heroBadge} pointerEvents="none">
                <Badge label={`−${product.discountPercent}%`} tone="sale" solid />
              </View>
            ) : null}

            <View style={styles.heroFavorite}>
              <FavoriteButton productId={product.id} size={22} />
            </View>
          </Animated.View>

          {/* 2. Цена — сразу под фото и ДО названия: главная привычка WB */}
          <Animated.View entering={reveal(0)} style={styles.block}>
            <ProductPriceBlock product={product} />
          </Animated.View>

          {/* 3–4. Категория «хлебной крошкой», следом название и краткое описание */}
          <Animated.View entering={reveal(1)} style={styles.block}>
            {product.category ? (
              <PressableScale
                haptic="none"
                hitSlop={HIT_SLOP}
                onPress={() =>
                  router.push(`/catalog?category=${encodeURIComponent(product.category?.slug ?? "")}` as Href)
                }
                accessibilityRole="button"
                accessibilityLabel={`Категория: ${product.category.name}`}
                style={styles.categoryRow}
              >
                {/* мелкая ссылка — brandText: основной бренд на белом не добирает 4.5:1 */}
                <AppText variant="footnote" weight="600" numberOfLines={1} style={{ color: colors.brandText }}>
                  {product.category.name}
                </AppText>
                <SymbolView name="chevron.right" size={10} tintColor={colors.brandText} weight="semibold" />
              </PressableScale>
            ) : null}

            {/* название после цены — привычка WB; title2, а не title1: на этой
              * позиции крупнее выглядит криком, а не заголовком */}
            <AppText variant="title2">{product.name}</AppText>

            {product.shortDescription ? (
              <AppText variant="callout" color="muted" style={styles.lead}>
                {product.shortDescription}
              </AppText>
            ) : null}
          </Animated.View>

          {/* Как это работает: доставка, заявка, оплата при получении */}
          <Animated.View entering={reveal(2)} style={styles.block}>
            <ProductAssurance price={product.price} />
          </Animated.View>

          {/* 5. Характеристики таблицей «свойство — значение» */}
          {hasProductSpecs(product) ? (
            <Animated.View entering={reveal(3)} style={styles.block}>
              <ProductSpecs product={product} />
            </Animated.View>
          ) : null}

          {/* 10. Наша функция — отдельным блоком, чтобы не спорить с покупкой */}
          <Animated.View entering={reveal(4)} style={styles.block}>
            <ProductTrackerCard product={product} />
          </Animated.View>

          {/* 6. Описание открыто, остальное — свёрнутыми секциями */}
          {sections.length > 0 ? (
            <Animated.View entering={reveal(5)} style={[styles.block, styles.sections]}>
              {sections.map((section, index) => (
                <AccordionSection
                  key={section.key}
                  title={section.title}
                  text={section.text}
                  icon={section.icon}
                  defaultOpen={index === 0}
                />
              ))}
            </Animated.View>
          ) : null}

          {/* 7. Обязательная плашка БАД — сразу после противопоказаний */}
          <Animated.View entering={reveal(6)} style={styles.block}>
            <BadDisclaimer />
          </Animated.View>

          {/* 8. «С этим товаром покупают» — лента похожих внизу карточки */}
          {showRelated ? (
            <Animated.View entering={reveal(7)} style={styles.related}>
              <SectionHeader title="С этим товаром покупают" style={styles.relatedHeader} />
              <ProductStrip
                products={related}
                isLoading={relatedQuery.isPending}
              />
            </Animated.View>
          ) : null}
        </Animated.ScrollView>

        <Animated.View
          style={[styles.bar, { bottom: buyBarBottom }, barStyle]}
          onLayout={onBuyBarLayout}
          pointerEvents="box-none"
        >
          <ProductBuyBar product={product} flightSource={heroRef} />
        </Animated.View>

        <ImageViewer
          visible={viewer.visible}
          uri={product.images[viewer.index]?.url ?? null}
          alt={product.images[viewer.index]?.alt}
          index={viewer.index}
          total={product.images.length}
          onClose={() => setViewer((state) => ({ ...state, visible: false }))}
        />
      </View>
    </FlyToCartProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { justifyContent: "center" },
  heroBadge: { position: "absolute", top: spacing.base, left: spacing.base },
  heroFavorite: { position: "absolute", top: spacing.sm, right: spacing.sm },

  block: { paddingHorizontal: spacing.base, paddingTop: spacing.lg, gap: spacing.sm },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    // 30 pt строки + hitSlop 8 сверху и снизу = 46 pt зоны нажатия
    paddingVertical: spacing.xs + 2,
  },
  lead: { marginTop: spacing.xs },

  sections: { gap: spacing.md },

  related: { paddingTop: spacing["2xl"] },
  relatedHeader: { paddingHorizontal: spacing.base },

  bar: { position: "absolute", left: 0, right: 0, paddingHorizontal: spacing.base },
});
