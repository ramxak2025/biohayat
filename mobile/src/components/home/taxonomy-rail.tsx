import { ScrollView, StyleSheet, View } from "react-native";

import type { TaxonomyItem } from "@/api/types";
import { Chip, ErrorState, Skeleton } from "@/components/ui";
import { radii, spacing } from "@/theme";

import { sfSymbolFor } from "./icon-map";

export interface TaxonomyRailProps {
  items: TaxonomyItem[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onPress: (item: TaxonomyItem) => void;
  /** Лента со скроллом (много значений) или перенос по строкам (2–4 значения). */
  scrollable?: boolean;
  /** Сколько заглушек рисовать, пока грузится. */
  skeletonCount?: number;
}

/** Ось каталога («кому» / «зачем») пилюлями: тап ведёт в каталог с фильтром. */
export function TaxonomyRail({
  items,
  isLoading,
  error,
  onRetry,
  onPress,
  scrollable = true,
  skeletonCount = 4,
}: TaxonomyRailProps) {
  if (error && items.length === 0) {
    return <ErrorState error={error} onRetry={onRetry} compact style={styles.padded} />;
  }

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.wrap, styles.padded]}>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <Skeleton key={index} width={index % 2 ? 132 : 108} height={40} radius={radii.pill} />
        ))}
      </View>
    );
  }

  if (items.length === 0) return null;

  const chips = items.map((item) => (
    <Chip
      key={item.slug}
      label={item.name}
      icon={sfSymbolFor(item.icon)}
      onPress={() => onPress(item)}
    />
  ));

  if (!scrollable) return <View style={[styles.wrap, styles.padded]}>{chips}</View>;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      contentContainerStyle={styles.track}
    >
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: { paddingHorizontal: spacing.base, gap: spacing.sm },
  padded: { paddingHorizontal: spacing.base },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
