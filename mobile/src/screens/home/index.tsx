/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика скролла — штатный способ передать позицию на UI-поток. Правило
 * React Compiler про shared values не знает и даёт ложное срабатывание. */
import { RefreshControl, StyleSheet, View } from "react-native";
import { useCallback, useState } from "react";
import { Stack, useRouter, type NativeStackNavigationOptions } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";

import type { Category, MaterialListItem, Product, TaxonomyItem } from "@/api/types";
import {
  ArticlesRail,
  CategoryRail,
  HeroCarousel,
  HomeChroma,
  HomeSection,
  PromoStrip,
  TaxonomyRail,
  TrustBlock,
  useBannerNavigate,
  useHeroHeight,
} from "@/components/home";
import { ProductStrip } from "@/components/product-card";
import { homeScrollOffset } from "@/lib/display-layout";
import { AppText, BadDisclaimer, ErrorState, useTabBarInset } from "@/components/ui";
import { palette, spacing, useColors } from "@/theme";
import { HOME_CHROMA_MIN_HEIGHT } from "@/lib/display-layout";

import { useHomeData } from "./use-home-data";

/**
 * Системной шапки на главной нет вовсе.
 *
 * Крупный заголовок «ХАЯТ» занимал верхнюю треть экрана и при скролле
 * схлопывался в плашку — ровно то «уродливое прилипание», от которого экран
 * выглядел не витриной, а формой. Вместо него герой во весь верх и плавающая
 * хрома поверх него (`HomeChroma`), которая ничего не двигает в контенте.
 *
 * Вынесено из рендера: навигатор сравнивает опции по ссылке.
 */
const SCREEN_OPTIONS: NativeStackNavigationOptions = { headerShown: false };

export function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const [heroContentHeight, setHeroContentHeight] = useState(0);
  const [chromaHeight, setChromaHeight] = useState(HOME_CHROMA_MIN_HEIGHT);
  const heroHeight = useHeroHeight(heroContentHeight, chromaHeight);
  const onHeroContentHeight = useCallback((height: number) => {
    const next = Math.ceil(height);
    setHeroContentHeight((previous) => previous === next ? previous : next);
  }, []);
  const onChromaHeight = useCallback((height: number) => {
    const next = Math.ceil(height);
    setChromaHeight((previous) => previous === next ? previous : next);
  }, []);
  const openBanner = useBannerNavigate();
  const data = useHomeData();

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    // Домашняя вкладка владеет edge-to-edge inset; учитываем фактический native inset
    // и при восстановлении экрана, чтобы порог хромы не зависел от отрицательного offset.
    scrollY.value = homeScrollOffset(event.contentOffset.y, event.contentInset.top);
  });

  const openCatalog = () => router.push("/catalog");
  const openCategory = (category: Category) =>
    router.push({ pathname: "/catalog", params: { category: category.slug } });
  const openAudience = (item: TaxonomyItem) =>
    router.push({ pathname: "/catalog", params: { audience: item.slug } });
  const openGoal = (item: TaxonomyItem) =>
    router.push({ pathname: "/catalog", params: { goal: item.slug } });
  const openHits = () => router.push({ pathname: "/catalog", params: { featured: "true" } });
  const openSale = () => router.push({ pathname: "/catalog", params: { onSale: "true" } });
  const openArticles = () =>
    router.push("./articles" as `./${string}`, { relativeToDirectory: true });
  const openArticle = (item: MaterialListItem) =>
    router.push(`./article/${item.slug}` as `./${string}`, {
      relativeToDirectory: true,
    });

  if (data.fatalError) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <Stack.Screen options={SCREEN_OPTIONS} />
        <Animated.ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[
            styles.fatal,
            { paddingTop: insets.top, paddingBottom: tabInset },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={data.isRefreshing}
              onRefresh={() => void data.refresh()}
              tintColor={colors.textFaint}
              colors={[colors.brand]}
              progressViewOffset={insets.top}
            />
          }
        >
          <ErrorState error={data.fatalError} onRetry={() => void data.refresh()} />
        </Animated.ScrollView>
      </View>
    );
  }

  // секцию с пустым результатом не рисуем вовсе: заголовок без контента —
  // это дырка в макете, а не «пусто»
  const categories = data.categories.data ?? [];
  const audiences = data.taxonomy.data?.audiences ?? [];
  const goals = data.taxonomy.data?.goals ?? [];
  const promos = data.promo.data ?? [];
  const articles = data.materials.data ?? [];

  const showCategories =
    data.categories.isLoading || data.categories.isError || categories.length > 0;
  const showAudiences = data.taxonomy.isLoading || data.taxonomy.isError || audiences.length > 0;
  const showGoals = data.taxonomy.isLoading || goals.length > 0;
  const showPromos = data.promo.isLoading || promos.length > 0;
  const showArticles = data.materials.isLoading || data.materials.isError || articles.length > 0;

  const legal = data.settings.data?.legal;
  const legalLine = [
    `© ${new Date().getFullYear()} ${legal?.name ?? "ХАЯТ"}`,
    legal?.inn ? `ИНН ${legal.inn}` : null,
    legal?.ogrn ? `ОГРН ${legal.ogrn}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={SCREEN_OPTIONS} />

      <Animated.ScrollView
        /* "never", а не "automatic": автоматический инсет сдвинул бы герой из-под
         * статус-бара вниз и начал отсчёт скролла с отрицательного значения.
         * Инсет таб-бара поэтому добавляем сами — ниже. */
        contentInsetAdjustmentBehavior="never"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
        // полосу прокрутки держим в безопасной зоне: сам скролл идёт от края до края
        scrollIndicatorInsets={{ top: insets.top, bottom: tabInset }}
        contentContainerStyle={{ paddingBottom: tabInset + spacing["2xl"] }}
        refreshControl={
          <RefreshControl
            refreshing={data.isRefreshing}
            onRefresh={() => void data.refresh()}
            // спиннер появляется на фотографии героя — там читается только белый
            tintColor={palette.surface}
            colors={[colors.brand]}
            progressViewOffset={insets.top}
          />
        }
      >
        <HeroCarousel
          banners={data.hero.data ?? []}
          isLoading={data.hero.isLoading}
          onPressBanner={(banner) => openBanner(banner.link)}
          onOpenCatalog={openCatalog}
          scrollY={scrollY}
          height={heroHeight}
          onContentHeightChange={onHeroContentHeight}
        />

        {/* Непрозрачная подложка под всеми секциями. Герой на «резинке» растёт
            вверх, и его нижняя кромка обязана упираться ровно в тот же цвет, в
            который растворяется его градиент, — иначе на стыке мелькнёт полоска. */}
        <View style={{ backgroundColor: colors.background }}>
          {data.hero.isError ? (
            <HomeSection index={0}>
              <ErrorState compact error={data.hero.error} title="Не удалось загрузить баннеры" onRetry={() => void data.hero.refetch()} />
            </HomeSection>
          ) : null}
          {showCategories ? (
            <HomeSection index={1} title="Категории" onAction={openCatalog}>
              <CategoryRail
                categories={categories}
                isLoading={data.categories.isLoading}
                error={data.categories.error}
                onRetry={() => void data.categories.refetch()}
                onPress={openCategory}
                onPressAll={openCatalog}
              />
            </HomeSection>
          ) : null}

          {showAudiences ? (
            <HomeSection index={2} title="Кому" subtitle="Подборки под возраст и образ жизни">
              <TaxonomyRail
                items={audiences}
                isLoading={data.taxonomy.isLoading}
                error={data.taxonomy.error}
                onRetry={() => void data.taxonomy.refetch()}
                onPress={openAudience}
                scrollable={false}
                skeletonCount={3}
              />
            </HomeSection>
          ) : null}

          {showGoals ? (
            <HomeSection index={3} title="Зачем" subtitle="Выберите цель — покажем подходящее">
              <TaxonomyRail
                items={goals}
                isLoading={data.taxonomy.isLoading}
                onPress={openGoal}
                skeletonCount={5}
              />
            </HomeSection>
          ) : null}

          <ProductSection
            index={4}
            title="Хиты продаж"
            onAction={openHits}
            products={data.hits.data}
            isLoading={data.hits.isLoading}
            error={data.hits.error}
            onRetry={() => void data.hits.refetch()}
          />

          {showPromos || data.promo.isError ? (
            <HomeSection index={5}>
              {data.promo.isError ? (
                <ErrorState compact error={data.promo.error} title="Не удалось загрузить предложения" onRetry={() => void data.promo.refetch()} />
              ) : (
                <PromoStrip
                  banners={promos}
                  isLoading={data.promo.isLoading}
                  onPressBanner={(banner) => openBanner(banner.link)}
                />
              )}
            </HomeSection>
          ) : null}

          <ProductSection
            index={6}
            title="Акции"
            subtitle="Цена ниже обычной"
            onAction={openSale}
            products={data.sale.data}
            isLoading={data.sale.isLoading}
            error={data.sale.error}
            onRetry={() => void data.sale.refetch()}
          />

          {showArticles ? (
            <HomeSection
              index={7}
              title="Статьи"
              subtitle="Коротко о главном"
              onAction={openArticles}
            >
              <ArticlesRail
                items={articles}
                isLoading={data.materials.isLoading}
                error={data.materials.error}
                onRetry={() => void data.materials.refetch()}
                onPress={openArticle}
              />
            </HomeSection>
          ) : null}

          <HomeSection index={8} title="Доставка и контакты">
            {data.settings.isError ? (
              <ErrorState compact error={data.settings.error} title="Не удалось загрузить контакты" onRetry={() => void data.settings.refetch()} />
            ) : (
              <TrustBlock settings={data.settings.data} isLoading={data.settings.isLoading} />
            )}
          </HomeSection>

          <View style={styles.legal}>
            <BadDisclaimer />
            <AppText variant="caption2" color="faint" align="center">
              {legalLine}
            </AppText>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Хрома рисуется ПОСЛЕ скролла: она лежит поверх героя и не входит в поток */}
      <HomeChroma scrollY={scrollY} heroHeight={heroHeight} barHeight={chromaHeight} onBarHeightChange={onChromaHeight} />
    </View>
  );
}

interface ProductSectionProps {
  index: number;
  title: string;
  subtitle?: string;
  onAction: () => void;
  products: Product[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

/** Полоса товаров: пустую подборку не показываем вовсе — дырка хуже её отсутствия. */
function ProductSection({
  index,
  title,
  subtitle,
  onAction,
  products,
  isLoading,
  error,
  onRetry,
}: ProductSectionProps) {
  const items = products ?? [];
  if (!isLoading && !error && items.length === 0) return null;

  return (
    <HomeSection index={index} title={title} subtitle={subtitle} onAction={onAction}>
      {error && items.length === 0 ? (
        <ErrorState error={error} onRetry={onRetry} compact style={styles.padded} />
      ) : (
        <ProductStrip products={items} isLoading={isLoading} />
      )}
    </HomeSection>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fatal: { flexGrow: 1, justifyContent: "center" },
  padded: { paddingHorizontal: spacing.base },
  legal: {
    marginTop: spacing["2xl"],
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
});
