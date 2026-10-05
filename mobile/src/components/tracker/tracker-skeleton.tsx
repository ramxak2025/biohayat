import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { Card, Skeleton } from "@/components/ui";
import { Duration, Ease, radii, spacing, staggerDelay } from "@/theme";

/**
 * Скелет трекера: повторяет реальную сетку, чтобы контент не «прыгал» после загрузки.
 *
 * Появление отложено на `Duration.instant`: при попадании в кэш данные приходят
 * быстрее, и скелет не успевает мелькнуть — а мелькание раздражает сильнее, чем
 * пустой экран на 120 мс. Сам блик рисует общий `Skeleton` (мягкий градиентный
 * проход, не мигание прозрачностью).
 */
export function TrackerSkeleton() {
  const reduced = useReducedMotion();

  const appear = (index: number) =>
    reduced
      ? undefined
      : FadeIn.duration(Duration.base)
          .easing(Ease.power2Out)
          .delay(Duration.instant + staggerDelay(index, 70, 3));

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View entering={appear(0)}>
        <Card padded={spacing.base}>
          <View style={styles.top}>
            <Skeleton width={92} height={92} radius={radii.pill} />
            <View style={styles.info}>
              <Skeleton width="55%" height={22} />
              <Skeleton width="80%" height={16} />
              <Skeleton width="40%" height={24} radius={radii.pill} />
            </View>
          </View>
          <View style={styles.week}>
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} width={36} height={36} radius={radii.pill} />
            ))}
          </View>
        </Card>
      </Animated.View>

      {Array.from({ length: 2 }).map((_, index) => (
        <Animated.View key={index} entering={appear(index + 1)}>
          <Card padded={spacing.base}>
            <View style={styles.header}>
              <Skeleton width={36} height={36} radius={radii.pill} />
              <View style={styles.headerText}>
                <Skeleton width="70%" height={18} />
                <Skeleton width="40%" height={14} />
              </View>
            </View>
            <View style={styles.slots}>
              <Skeleton width={116} height={54} radius={radii.lg} />
              <Skeleton width={116} height={54} radius={radii.lg} />
            </View>
          </Card>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  top: { flexDirection: "row", gap: spacing.base, alignItems: "center" },
  info: { flex: 1, gap: spacing.sm },
  week: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl },
  header: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  headerText: { flex: 1, gap: spacing.sm },
  slots: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.base },
});
