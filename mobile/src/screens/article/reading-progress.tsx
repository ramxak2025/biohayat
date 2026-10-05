import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { useColors } from "@/theme";

export interface ReadingProgressProps {
  scrollY: SharedValue<number>;
  contentHeight: SharedValue<number>;
  viewportHeight: SharedValue<number>;
}

/**
 * Тонкая полоса прогресса чтения под шапкой. Считается на UI-потоке, поэтому
 * не отстаёт от пальца. Reduce Motion не отключаем: полоса следует за жестом,
 * а не двигается сама по себе.
 */
export function ReadingProgress({ scrollY, contentHeight, viewportHeight }: ReadingProgressProps) {
  const colors = useColors();

  const bar = useAnimatedStyle(() => {
    const scrollable = contentHeight.value - viewportHeight.value;
    if (scrollable <= 24) return { opacity: 0, transform: [{ scaleX: 0 }] };
    const progress = Math.min(1, Math.max(0, scrollY.value / scrollable));
    return { opacity: 1, transform: [{ scaleX: progress }] };
  });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.bar, { backgroundColor: colors.brand }, bar]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    // рост слева направо, а не от центра
    transformOrigin: "left center",
  },
});
