import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";

import { AppText, PressableScale } from "@/components/ui";
import { MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

export type MenuRowTone = "brand" | "accent" | "neutral" | "danger";

export interface MenuRowProps {
  icon?: SymbolViewProps["name"];
  iconElement?: ReactNode;
  tone?: MenuRowTone;
  title: string;
  subtitle?: string;
  /** Правая подпись: счётчик, значение настройки. */
  value?: string;
  /** Произвольный правый элемент (переключатель). Отменяет шеврон. */
  right?: ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Ширина отступа разделителя: поле карточки + плитка иконки + зазор. */
export const MENU_ROW_INSET = spacing.base + 30 + spacing.md;

/**
 * Строка списка в духе системных «Настроек»: плитка-иконка, заголовок,
 * значение справа, шеврон. Высота растёт вместе с Dynamic Type.
 */
export function MenuRow({
  icon,
  iconElement,
  tone = "brand",
  title,
  subtitle,
  value,
  right,
  chevron = true,
  destructive = false,
  disabled = false,
  onPress,
  accessibilityHint,
  style,
}: MenuRowProps) {
  const colors = useColors();

  const tile: Record<MenuRowTone, string> = {
    brand: colors.brandSoft,
    accent: colors.accentSoft,
    neutral: colors.surfaceSunken,
    danger: colors.surfaceSunken,
  };
  const glyph: Record<MenuRowTone, string> = {
    brand: colors.brand,
    accent: colors.accent,
    neutral: colors.textMuted,
    danger: colors.danger,
  };

  const body = (
    <>
      {icon || iconElement ? (
        <View style={[styles.tile, { backgroundColor: tile[tone] }]}>
          {iconElement ?? (icon ? <SymbolView name={icon} size={17} tintColor={glyph[tone]} weight="semibold" /> : null)}
        </View>
      ) : null}

      <View style={styles.titles}>
        <AppText variant="body" color={destructive ? "danger" : "text"}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" color="muted" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {value ? (
        <AppText variant="subhead" color="faint" numberOfLines={1} maxScale={1.4}>
          {value}
        </AppText>
      ) : null}

      {right ?? (chevron && onPress ? (
        <SymbolView name="chevron.right" size={13} tintColor={colors.textFaint} weight="semibold" />
      ) : null)}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, disabled ? styles.disabled : null, style]}>{body}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scale={0.985}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={[styles.row, disabled ? styles.disabled : null, style]}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: MIN_TAP_SIZE + 8,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  tile: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  titles: { flex: 1 },
  subtitle: { marginTop: 1 },
  disabled: { opacity: 0.45 },
});
