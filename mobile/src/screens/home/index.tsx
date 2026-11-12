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
  HomeChroma,
  HomeSection,
  PromoStrip,
  TaxonomyRail,
  TrustBlock,
  useBannerNavigate,
} from "@/components/home";
import { VysotaDirectionRail, VysotaHomeHero } from "@/components/home/vysota-home";
import { ProductCard, ProductStrip } from "@/components/product-card";
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
  const [heroHeight, setHeroHeight] = useState(0);
  const [chromaHeight, setChromaHeight] = useState(HOME_CHROMA_MIN_HEIGHT);
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
  const promos = [...(data.hero.data ?? []), ...(data.promo.data ?? [])];
  const articles = data.materials.data ?? [];

  const showCategories =
    data.categories.isLoading || data.categories.isError || categories.length > 0;
  const showAudiences = data.taxonomy.isLoading || data.taxonomy.isError || audiences.length > 0;
  const showGoals = data.taxonomy.isLoading || goals.length > 0;
  const showPromos = data.hero.isLoading || data.promo.isLoading || promos.length > 0;
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
        <VysotaHomeHero
          topClearance={insets.top + chromaHeight}
          onLayout={setHeroHeight}
          onOpenCatalog={openCatalog}
        />
        <VysotaDirectionRail onSelect={(direction) => router.push({ pathname: "/catalog", params: { direction } })} />

        <View style={{ backgroundColor: colors.background }}>
          <ProductSection
            index={0}
            title="Из каталога"
            onAction={openCatalog}
            products={data.selection.data}
            isLoading={data.selection.isLoading}
            error={data.selection.error}
            onRetry={() => void data.selection.refetch()}
            rows
          />

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

          {showPromos || data.promo.isError || data.hero.isError ? (
            <HomeSection index={5} title="Предложения">
              {data.promo.isError || data.hero.isError ? (
                <ErrorState compact error={data.promo.error ?? data.hero.error} title="Не удалось загрузить предложения" onRetry={() => {
                  void data.hero.refetch();
                  void data.promo.refetch();
                }} />
              ) : null}
              <PromoStrip
                banners={promos}
                isLoading={data.hero.isLoading || data.promo.isLoading}
                onPressBanner={(banner) => openBanner(banner.link)}
              />
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
  rows?: boolean;
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
  rows,
}: ProductSectionProps) {
  const items = products ?? [];
  if (!isLoading && !error && items.length === 0) return null;

  return (
    <HomeSection index={index} title={title} subtitle={subtitle} onAction={onAction}>
      {error && items.length === 0 ? (
        <ErrorState error={error} onRetry={onRetry} compact style={styles.padded} />
      ) : rows && items.length ? (
        <View style={styles.productRows}>
          {items.map((product) => <ProductCard key={product.id} product={product} layout="row" />)}
        </View>
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
  productRows: { paddingHorizontal: spacing.base, gap: 10 },
  legal: {
    marginTop: spacing["2xl"],
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
});
