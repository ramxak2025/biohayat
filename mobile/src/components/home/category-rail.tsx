import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SymbolView } from "expo-symbols";

import type { Category } from "@/api/types";
import { AppText, ErrorState, PressableScale, Skeleton } from "@/components/ui";
import { radii, shadows, spacing, useColors } from "@/theme";

import { sfSymbolFor } from "./icon-map";
import { categoryTileWidth } from "@/lib/display-layout";

const TILE_WIDTH = 158;
const GAP = spacing.md;

export interface CategoryRailProps {
  categories: Category[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onPress: (category: Category) => void;
  onPressAll: () => void;
}

/**
 * Категорий 17 — вертикальной сеткой они съели бы весь экран. Кладём их в
 * ленту 2×N со снапом: видно, что список продолжается, и главная остаётся
 * пролистываемой за пару движений.
 */
export function CategoryRail({
  categories,
  isLoading,
  error,
  onRetry,
  onPress,
  onPressAll,
}: CategoryRailProps) {
  const { width, fontScale } = useWindowDimensions();
  const tileWidth = categoryTileWidth(width, fontScale);
  if (error && categories.length === 0) {
    return <ErrorState error={error} onRetry={onRetry} compact style={styles.state} />;
  }

  if (isLoading && categories.length === 0) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
      >
        {[0, 1, 2].map((column) => (
          <View key={column} style={styles.column}>
            <Skeleton width={tileWidth} height={72} radius={radii.xl} />
            <Skeleton width={tileWidth} height={72} radius={radii.xl} />
          </View>
        ))}
      </ScrollView>
    );
  }

  if (categories.length === 0) return null;

  const columns: Category[][] = [];
  for (let i = 0; i < categories.length; i += 2) columns.push(categories.slice(i, i + 2));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={tileWidth + GAP}
      snapToAlignment="start"
      decelerationRate="fast"
      contentContainerStyle={styles.track}
    >
      {columns.map((column) => (
        <View key={column[0].id} style={styles.column}>
          {column.map((category) => (
            <CategoryTile key={category.id} category={category} onPress={onPress} width={tileWidth} />
          ))}
        </View>
      ))}

      <View style={styles.column}>
        <AllTile onPress={onPressAll} width={tileWidth} />
      </View>
    </ScrollView>
  );
}

function CategoryTile({
  category,
  onPress,
  width,
}: {
  category: Category;
  onPress: (category: Category) => void;
  width: number;
}) {
  const colors = useColors();

  return (
    <PressableScale
      onPress={() => onPress(category)}
      accessibilityRole="button"
      accessibilityLabel={category.name}
      style={[
        styles.tile,
        { width },
        shadows.xs,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <View style={[styles.glyph, { backgroundColor: colors.brandSoft }]}>
        <SymbolView name={sfSymbolFor(category.icon)} size={19} tintColor={colors.brand} />
      </View>
      <AppText variant="subhead" weight="600" style={styles.tileLabel}>
        {category.name}
      </AppText>
    </PressableScale>
  );
}

function AllTile({ onPress, width }: { onPress: () => void; width: number }) {
  const colors = useColors();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Все категории каталога"
      style={[styles.tile, { width, backgroundColor: colors.brandSoft, borderColor: colors.brandBorder }]}
    >
      <View style={[styles.glyph, { backgroundColor: colors.brand }]}>
        <SymbolView name="square.grid.2x2.fill" size={18} tintColor={colors.textOnBrand} />
      </View>
      <AppText
        variant="subhead"
        weight="600"
        color="brand"
        style={styles.tileLabel}
      >
        Весь каталог
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  track: { paddingHorizontal: spacing.base, gap: GAP },
  state: { paddingHorizontal: spacing.base },
  column: { gap: GAP },
  tile: {
    // flex: 1 внутри растянутой колонки — все плитки ленты одной высоты,
    // а одинокая «Весь каталог» занимает обе строки
    flex: 1,
    width: TILE_WIDTH,
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: { flex: 1, minWidth: 0 },
});
