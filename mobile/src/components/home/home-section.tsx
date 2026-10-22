import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { SectionHeader } from "@/components/ui";
import { spacing } from "@/theme";

export interface HomeSectionProps {
  /** Сохраняется для совместимости с существующим порядком секций. */
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
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  style,
}: HomeSectionProps) {
  return (
    <View style={[styles.section, style]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  header: { paddingHorizontal: spacing.base },
});
