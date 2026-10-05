import { ScrollView, StyleSheet, View } from "react-native";

import { Skeleton } from "@/components/ui";
import { radii, spacing, useColors } from "@/theme";

export interface ProductScreenSkeletonProps {
  /** Высота героя = высоте будущей галереи, чтобы контент не «прыгнул» после загрузки. */
  heroHeight: number;
}

/**
 * Скелетон карточки товара: повторяет реальную сетку блок в блок — и в том же
 * порядке, что и настоящий экран (фото → цена → название → характеристики).
 * Иначе после загрузки контент переставляется у человека на глазах.
 */
export function ProductScreenSkeleton({ heroHeight }: ProductScreenSkeletonProps) {
  const colors = useColors();

  return (
    <ScrollView
      scrollEnabled={false}
      // тот же режим, что и у настоящего экрана, — иначе герой скакнёт после загрузки
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: colors.background }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Skeleton width="100%" height={heroHeight} radius={0} />

      <View style={styles.body}>
        {/* цена — первый блок под фото */}
        <Skeleton width={168} height={32} />
        <Skeleton width={96} height={14} />

        <View style={styles.badges}>
          <Skeleton width={96} height={24} radius={radii.pill} />
          <Skeleton width={64} height={24} radius={radii.pill} />
        </View>

        {/* категория и название */}
        <Skeleton width={120} height={12} style={styles.gap} />
        <Skeleton width="92%" height={22} />
        <Skeleton width="64%" height={22} />
        <Skeleton width="100%" height={16} style={styles.gap} />
        <Skeleton width="80%" height={16} />

        {/* доставка и оплата */}
        <Skeleton width="100%" height={132} radius={radii["2xl"]} style={styles.block} />

        {/* характеристики */}
        <Skeleton width={160} height={20} style={styles.block} />
        <Skeleton width="100%" height={196} radius={radii["2xl"]} />

        {/* курс приёма */}
        <Skeleton width="100%" height={72} radius={radii["2xl"]} style={styles.block} />

        {/* описание, состав, применение, противопоказания */}
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} width="100%" height={60} radius={radii["2xl"]} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.base, gap: spacing.md },
  badges: { flexDirection: "row", gap: spacing.sm },
  gap: { marginTop: spacing.sm },
  block: { marginTop: spacing.sm },
});
