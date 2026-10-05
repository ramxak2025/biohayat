import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import type { MaterialListItem } from "@/api/types";
import { AppText, PressableScale, Skeleton } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Duration, Ease, radii, shadows, spacing, staggerDelay, useColors } from "@/theme";

/** Обложки материалов — 1200×675, то есть 16:9. Держим пропорцию везде. */
const COVER_RATIO = 16 / 9;
const ROW_COVER_WIDTH = 112;
const ROW_COVER_HEIGHT = 84;

/** Нейтральная заглушка на время загрузки: на белом фоне «прыжок» картинки заметнее. */
const COVER_BLURHASH = "L6Pj0^i_.AyE_3t7t7R**0o#DgR4";

export type ArticleCardVariant = "feature" | "row";

export interface ArticleCardProps {
  item: MaterialListItem;
  variant?: ArticleCardVariant;
  /** Позиция в списке — задаёт задержку появления. */
  index?: number;
  onPress: (item: MaterialListItem) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Карточка материала. `feature` — первая в списке, обложка во всю ширину;
 * `row` — компактная строка для остального списка и блока «Другие материалы».
 */
export function ArticleCard({ item, variant = "row", index = 0, onPress, style }: ArticleCardProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const feature = variant === "feature";

  const meta = item.publishedAt ? formatDate(item.publishedAt) : null;

  const cover = (
    <View
      style={[
        feature ? styles.featureCover : styles.rowCover,
        { backgroundColor: colors.brandSoft },
      ]}
    >
      {item.coverImage ? (
        <Image
          source={{ uri: item.coverImage }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={240}
          cachePolicy="memory-disk"
          recyclingKey={item.id}
          placeholder={{ blurhash: COVER_BLURHASH }}
          placeholderContentFit="cover"
          accessibilityIgnoresInvertColors
          alt={item.title}
        />
      ) : (
        // обложка у материалов часто пустая — вместо серого прямоугольника брендовая заглушка
        <View style={styles.coverFallback}>
          <SymbolView
            name="newspaper.fill"
            size={feature ? 30 : 22}
            tintColor={colors.brand}
            weight="regular"
          />
          {feature ? (
            <AppText variant="caption2" color="brand" weight="700">
              ХАЯТ · ПОЛЕЗНОЕ
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );

  const body = feature ? (
    <View style={styles.featureBody}>
      {meta ? (
        <AppText variant="caption" color="brand" weight="600">
          {meta}
        </AppText>
      ) : null}
      <AppText variant="title3" numberOfLines={3} style={styles.featureTitle}>
        {item.title}
      </AppText>
      {item.excerpt ? (
        <AppText variant="subhead" color="muted" numberOfLines={3} style={styles.excerpt}>
          {item.excerpt}
        </AppText>
      ) : null}
      <View style={styles.readRow}>
        <AppText variant="footnote" color="brand" weight="600">
          Читать
        </AppText>
        <SymbolView name="arrow.right" size={11} tintColor={colors.brand} weight="semibold" />
      </View>
    </View>
  ) : (
    <View style={styles.rowBody}>
      <AppText variant="headline" numberOfLines={2}>
        {item.title}
      </AppText>
      {item.excerpt ? (
        <AppText variant="footnote" color="muted" numberOfLines={2} style={styles.excerpt}>
          {item.excerpt}
        </AppText>
      ) : null}
      {meta ? (
        <AppText variant="caption" color="faint">
          {meta}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.delay(staggerDelay(index, 45)).duration(Duration.reveal).easing(Ease.power3Out)
      }
      style={style}
    >
      <PressableScale
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={meta ? `${item.title}. ${meta}` : item.title}
        accessibilityHint="Открыть статью"
        style={[
          feature ? styles.featureCard : styles.rowCard,
          shadows.sm,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        {cover}
        {body}
      </PressableScale>
    </Animated.View>
  );
}

/** Скелетон карточки — та же геометрия, чтобы список не «дёргался» после загрузки. */
export function ArticleCardSkeleton({ variant = "row" }: { variant?: ArticleCardVariant }) {
  const colors = useColors();
  const { width } = useWindowDimensions();

  if (variant === "feature") {
    // высоту обложки считаем руками: aspectRatio проигрывает явному height внутри Skeleton
    const coverHeight = Math.round((width - spacing.base * 2) / COVER_RATIO);
    return (
      <View style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Skeleton width="100%" height={coverHeight} radius={0} />
        <View style={styles.featureBody}>
          <Skeleton width="30%" height={12} />
          <Skeleton width="92%" height={22} />
          <Skeleton width="65%" height={22} />
          <Skeleton width="100%" height={14} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Skeleton width={ROW_COVER_WIDTH} height={ROW_COVER_HEIGHT} radius={radii.lg} />
      <View style={styles.rowBody}>
        <Skeleton width="90%" height={16} />
        <Skeleton width="60%" height={16} />
        <Skeleton width="35%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  featureCard: {
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  featureCover: { width: "100%", aspectRatio: COVER_RATIO },
  featureBody: { padding: spacing.base, gap: spacing.xs },
  featureTitle: { marginTop: spacing.xs / 2 },
  readRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },

  rowCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  rowCover: {
    width: ROW_COVER_WIDTH,
    height: ROW_COVER_HEIGHT,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  rowBody: { flex: 1, gap: spacing.xs / 2 },

  coverFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  excerpt: { marginTop: spacing.xs / 2 },
});
