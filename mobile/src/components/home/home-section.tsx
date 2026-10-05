import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { SectionHeader } from "@/components/ui";
import { Duration, Ease, spacing, staggerDelay } from "@/theme";

export interface HomeSectionProps {
  /** Порядковый номер секции — задаёт задержку появления (каскад сверху вниз). */
  index: number;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Блок главной: заголовок в полях экрана + контент, который сам решает, жить ему
 * в полях или во всю ширину (горизонтальные ленты доезжают до края — так iOS
 * показывает, что ленту можно листать).
 */
export function HomeSection({
  index,
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  style,
}: HomeSectionProps) {
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.delay(staggerDelay(index, 70, 7))
              .duration(Duration.reveal)
              .easing(Ease.power3Out)
      }
      style={[styles.section, style]}
    >
      {title ? (
        <View style={styles.header}>
          <SectionHeader
            title={title}
            subtitle={subtitle}
            actionLabel={actionLabel}
            onAction={onAction}
          />
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  header: { paddingHorizontal: spacing.base },
});
