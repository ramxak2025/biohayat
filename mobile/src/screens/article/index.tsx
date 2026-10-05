/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика скролла и onLayout — штатный способ передать позицию на UI-поток.
 * Правило React Compiler про shared values не знает и даёт ложное срабатывание;
 * в рендере `.value` не читается. */
import { useMemo, type ReactElement } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";

import { ApiError } from "@/api/client";
import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { MaterialListItem } from "@/api/types";
import {
  AppText,
  BadDisclaimer,
  Button,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  Skeleton,
  useDetailScreenOptions,
  useTabBarInset,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Duration, Ease, spacing, useColors } from "@/theme";

import { ArticleContent, READING_MAX_WIDTH } from "./article-content";
import { ArticleHero } from "./article-hero";
import { MoreArticles } from "./more-articles";
import { articleReadingMinutes, parseArticleContent } from "./parse-content";
import { ReadingProgress } from "./reading-progress";
import { shareArticle } from "./share-article";

/** Доля ширины экрана под обложку: 16:9 — это 0.56, чуть добавляем «воздуха». */
const HERO_RATIO = 0.6;
const HERO_MAX_HEIGHT = 320;
/** Сколько материалов показываем внизу статьи. */
const MORE_COUNT = 3;

export function ArticleScreen({ slug }: { slug: string }) {
  const colors = useColors();
  const router = useRouter();
  const reduced = useReducedMotion();
  const detailOptions = useDetailScreenOptions();
  const tabInset = useTabBarInset();
  const { width } = useWindowDimensions();

  const heroHeight = Math.round(Math.min(width * HERO_RATIO, HERO_MAX_HEIGHT));

  const query = useQuery({
    queryKey: qk.material(slug),
    queryFn: ({ signal }) => api.catalog.material(slug, signal),
    staleTime: 30 * 60 * 1000,
    // снятый с публикации материал повторять бессмысленно
    retry: (count, error) => !isNotFound(error) && count < 2,
  });

  const moreQuery = useQuery({
    queryKey: qk.materials,
    queryFn: ({ signal }) => api.catalog.materials(signal),
    staleTime: 30 * 60 * 1000,
    select: (items) => items.filter((item) => item.slug !== slug).slice(0, MORE_COUNT),
  });

  const material = query.data;
  const blocks = useMemo(() => parseArticleContent(material?.content), [material?.content]);
  const minutes = useMemo(() => (blocks.length > 0 ? articleReadingMinutes(blocks) : 0), [blocks]);

  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const openArticle = (item: MaterialListItem) =>
    router.push({ pathname: "/(tabs)/(home)/article/[slug]", params: { slug: item.slug } });
  const openArticles = () =>
    router.push("/(tabs)/(home)/articles");
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const screenOptions = (headerRight?: () => ReactElement) => (
    <Stack.Screen options={{ ...detailOptions, title: "Статья", headerRight }} />
  );

  if (query.isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {screenOptions()}
        <View>
          <Skeleton width="100%" height={heroHeight} radius={0} />
          <View style={styles.body}>
            <Skeleton width="40%" height={13} style={styles.skeletonLine} />
            <Skeleton width="95%" height={28} style={styles.skeletonLine} />
            <Skeleton width="70%" height={28} style={styles.skeletonLine} />
            <View style={styles.skeletonText}>
              {[0, 1, 2, 3, 4].map((key) => (
                <Skeleton key={key} width={key === 4 ? "60%" : "100%"} height={15} />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (query.isError || !material) {
    const notFound = isNotFound(query.error);
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background }]}>
        {screenOptions()}
        {notFound ? (
          <EmptyState
            icon="doc.text"
            title="Статья не найдена"
            subtitle="Возможно, материал сняли с публикации."
            actionLabel="К списку статей"
            onAction={goBack}
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        )}
      </View>
    );
  }

  const share = () => void shareArticle(material);

  const meta = [material.publishedAt ? formatDate(material.publishedAt) : null, minutes > 0 ? `${minutes} мин чтения` : null]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {screenOptions(() => (
        <IconButton
          name="square.and.arrow.up"
          label="Поделиться статьёй"
          color={colors.brand}
          size={19}
          onPress={share}
        />
      ))}

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        /* "never", а не "automatic": при автоматическом инсете стартовый
         * contentOffset.y отрицателен, и параллакс обложки начинался бы уже
         * увеличенным. Инсет таб-бара поэтому добавляем сами. */
        contentInsetAdjustmentBehavior="never"
        onLayout={(event) => {
          viewportHeight.value = event.nativeEvent.layout.height;
        }}
        onContentSizeChange={(_, height) => {
          contentHeight.value = height;
        }}
        contentContainerStyle={{ paddingBottom: tabInset + spacing["2xl"] }}
        showsVerticalScrollIndicator
      >
        <ArticleHero
          uri={material.coverImage}
          title={material.title}
          height={heroHeight}
          scrollY={scrollY}
          reducedMotion={reduced}
        />

        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(Duration.reveal).easing(Ease.power3Out)}
          style={styles.body}
        >
          {meta ? (
            <AppText variant="footnote" color="faint" style={styles.meta}>
              {meta}
            </AppText>
          ) : null}

          <AppText variant="title1" accessibilityRole="header" style={styles.title}>
            {material.title}
          </AppText>

          {material.excerpt ? (
            <AppText variant="callout" color="muted" selectable style={styles.lead}>
              {material.excerpt}
            </AppText>
          ) : null}

          <Divider style={styles.divider} />

          {blocks.length > 0 ? (
            <ArticleContent blocks={blocks} />
          ) : (
            <EmptyState
              compact
              icon="doc.plaintext"
              title="Текст материала готовится"
              subtitle="Мы уже дописываем эту статью — загляните чуть позже."
            />
          )}

          <Button
            title="Поделиться"
            variant="secondary"
            leftIcon="square.and.arrow.up"
            fullWidth
            onPress={share}
            accessibilityHint="Открыть системное меню «Поделиться»"
            style={styles.share}
          />

          <BadDisclaimer variant="compact" style={styles.disclaimer} />

          <MoreArticles
            items={moreQuery.data ?? []}
            isLoading={moreQuery.isPending}
            onPress={openArticle}
            onShowAll={openArticles}
          />
        </Animated.View>
      </Animated.ScrollView>

      <ReadingProgress
        scrollY={scrollY}
        contentHeight={contentHeight}
        viewportHeight={viewportHeight}
      />
    </View>
  );
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { justifyContent: "center", paddingHorizontal: spacing.base },
  body: {
    width: "100%",
    maxWidth: READING_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
  },
  meta: { marginBottom: spacing.xs },
  title: { marginBottom: spacing.sm },
  lead: { lineHeight: 24 },
  divider: { marginVertical: spacing.base },
  share: { marginTop: spacing.sm },
  disclaimer: { marginTop: spacing.lg },
  skeletonLine: { marginBottom: spacing.sm },
  skeletonText: { marginTop: spacing.base, gap: spacing.sm },
});
