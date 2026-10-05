import { ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";

import type { MaterialListItem } from "@/api/types";
import { AppText, ErrorState, PressableScale, Skeleton } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { radii, shadows, spacing, useColors } from "@/theme";

const CARD_WIDTH = 268;
const GAP = spacing.md;

export interface ArticlesRailProps {
  items: MaterialListItem[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onPress: (item: MaterialListItem) => void;
}

export function ArticlesRail({ items, isLoading, error, onRetry, onPress }: ArticlesRailProps) {
  if (error && items.length === 0) {
    return <ErrorState error={error} onRetry={onRetry} compact style={styles.state} />;
  }

  if (isLoading && items.length === 0) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
      >
        {[0, 1].map((index) => (
          <View key={index} style={styles.skeleton}>
            <Skeleton width={CARD_WIDTH} height={150} radius={radii.xl} />
            <Skeleton width="80%" height={15} />
            <Skeleton width="55%" height={13} />
          </View>
        ))}
      </ScrollView>
    );
  }

  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + GAP}
      snapToAlignment="start"
      decelerationRate="fast"
      contentContainerStyle={styles.track}
    >
      {items.map((item) => (
        <ArticleCard key={item.id} item={item} onPress={onPress} />
      ))}
    </ScrollView>
  );
}

function ArticleCard({
  item,
  onPress,
}: {
  item: MaterialListItem;
  onPress: (item: MaterialListItem) => void;
}) {
  const colors = useColors();

  return (
    <PressableScale
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <View style={[styles.cover, { backgroundColor: colors.brandSoft }]}>
        {item.coverImage ? (
          <Image
            source={{ uri: item.coverImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={240}
            cachePolicy="memory-disk"
            recyclingKey={item.id}
            accessibilityIgnoresInvertColors
            alt={item.title}
          />
        ) : (
          // у материалов обложка часто не заполнена — рисуем брендовую заглушку
          <View style={styles.coverFallback}>
            <SymbolView name="newspaper.fill" size={26} tintColor={colors.brand} />
            <AppText variant="caption2" color="brand" weight="700">
              ХАЯТ · ПОЛЕЗНОЕ
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <AppText variant="headline" numberOfLines={2}>
          {item.title}
        </AppText>
        {item.excerpt ? (
          <AppText variant="footnote" color="muted" numberOfLines={2}>
            {item.excerpt}
          </AppText>
        ) : null}
        {item.publishedAt ? (
          <AppText variant="caption" color="faint" style={styles.date}>
            {formatDate(item.publishedAt)}
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  track: { paddingHorizontal: spacing.base, gap: GAP },
  state: { paddingHorizontal: spacing.base },
  skeleton: { width: CARD_WIDTH, gap: spacing.sm },
  card: {
    width: CARD_WIDTH,
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
  },
  cover: { width: "100%", aspectRatio: 16 / 9, borderRadius: radii.lg, overflow: "hidden" },
  coverFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  body: { padding: spacing.sm, gap: spacing.xs },
  date: { marginTop: 2 },
});
