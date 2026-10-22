/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика скролла — штатный способ анимировать на UI-потоке. Правило
 * React Compiler про shared values не знает и даёт ложное срабатывание. */
import { useCallback, useState } from "react";
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useQuery } from "@tanstack/react-query";
import Animated, {
  FadeInDown,
  useAnimatedRef,
  useReducedMotion,
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
  ErrorState,
  IconButton,
  PressableScale,
  Screen,
  SectionHeader,
  useStackScreenOptions,
  useTabBarInset,
} from "@/components/ui";
import { Duration, Ease, HIT_SLOP, spacing, staggerDelay, useColors } from "@/theme";

import { shareProduct } from "./share-product";
import { productMediaHeight, productFooterClearance, PRODUCT_IDENTITY_MIN_HEIGHT } from "@/lib/product-layout";
import { ProductZoomTarget } from "@/components/product-card/product-link";

interface TextSection {
  key: string;
  title: string;
  icon: SFSymbol;
  text: string;
}

/** Название и категория объясняют товар до фотографии; покупка всегда доступна. */
export function ProductScreen({ slug }: { slug: string }) {
  const colors = useColors();
  const router = useRouter();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const tabInset = useTabBarInset();
  const detailOptions = useStackScreenOptions({ largeTitle: false, transparent: false });

  const mediaHeight = productMediaHeight(width);
  const [buyBarHeight, setBuyBarHeight] = useState(0);
  const onBuyBarLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.ceil(event.nativeEvent.layout.height);
    setBuyBarHeight((previous) => previous === height ? previous : height);
  }, []);
  const buyBarBottom = tabInset + spacing.sm;

  /** Источник полёта в корзину — реальная панель фотографий. */
  const heroRef = useAnimatedRef<View>();

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
        <ProductScreenSkeleton heroHeight={mediaHeight} />
      </>
    );
  }

  const product: Product | undefined = productQuery.data;

  if (!product) {
    return (
      <>
        <Stack.Screen options={{ ...detailOptions, title: "Товар" }} />
        <Screen headerTransparent={false} contentContainerStyle={styles.center}>
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
            title: "Товар",
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
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: productFooterClearance(buyBarHeight) }}
        >
          <View style={styles.identity}>
            <View style={styles.identityRow}>
              <AppText variant="title2" accessibilityRole="header" style={styles.name}>{product.name}</AppText>
              <FavoriteButton productId={product.id} onImage={false} size={22} />
            </View>
            {product.category ? (
              <PressableScale
                haptic="none"
                hitSlop={HIT_SLOP}
                onPress={() => router.push({ pathname: "/catalog", params: { category: product.category?.slug } })}
                accessibilityRole="button"
                accessibilityLabel={`Категория: ${product.category.name}`}
                style={styles.categoryRow}
              >
                <AppText variant="footnote" weight="600" style={{ color: colors.brandText }}>{product.category.name}</AppText>
                <SymbolView name="chevron.right" size={10} tintColor={colors.brandText} weight="semibold" />
              </PressableScale>
            ) : null}
          </View>

          <ProductZoomTarget>
            <Animated.View ref={heroRef} collapsable={false} style={styles.media}>
              <ProductGallery images={product.images} name={product.name} width={width - spacing.base * 2} height={mediaHeight} reducedMotion={reduced} onOpenImage={(index) => setViewer({ index, visible: true })} />
            </Animated.View>
          </ProductZoomTarget>

          <View style={styles.block}>
            <ProductPriceBlock product={product} />
            {product.shortDescription ? <AppText variant="callout" color="muted" style={styles.lead}>{product.shortDescription}</AppText> : null}
          </View>

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
          style={[styles.bar, { bottom: buyBarBottom }]}
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
  identity: { paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md, minHeight: PRODUCT_IDENTITY_MIN_HEIGHT },
  identityRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  name: { flex: 1, minWidth: 0 },
  media: { marginHorizontal: spacing.base },

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
