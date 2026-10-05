import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { AppText, PressableScale } from "@/components/ui";
import { HIT_SLOP, MIN_TAP_SIZE, radii, spacing, typography, useColors } from "@/theme";

export interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  /** Палец вернулся в поле — экран уходит обратно к подсказкам. */
  onFocus: () => void;
  onCancel: () => void;
}

/**
 * Крестик визуально мелкий (иначе он спорит с текстом), поэтому добираем зону
 * нажатия слопом: 20 pt глифа + 12 pt с каждой стороны = 44 pt по HIG.
 */
const CLEAR_HIT = { top: 12, bottom: 12, left: 12, right: 12 } as const;

/**
 * Поисковая строка: крупное поле-пилюля, крестик очистки и «Отмена» справа.
 *
 * Крестик рисуем свой, а не системный `clearButtonMode`: он должен работать
 * одинаково на обеих платформах и, главное, НЕ ронять фокус — после очистки
 * пользователь продолжает набирать, а не тыкает в поле заново.
 */
export function SearchField({ value, onChangeText, onSubmit, onFocus, onCancel }: SearchFieldProps) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Пока модалка едет вверх, autoFocus иногда теряется — подстраховываемся
    // отложенным фокусом уже после анимации презентации.
    const timer = setTimeout(() => {
      if (!inputRef.current?.isFocused()) inputRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  const clear = () => {
    onChangeText("");
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <SymbolView name="magnifyingglass" size={17} tintColor={colors.textFaint} weight="semibold" />

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          onFocus={onFocus}
          autoFocus
          inputMode="search"
          returnKeyType="search"
          enablesReturnKeyAutomatically
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          maxLength={64}
          // крестик свой (см. комментарий к компоненту) — системный выключаем
          clearButtonMode="never"
          placeholder="Поиск товаров"
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.brand}
          accessibilityLabel="Поиск товаров"
          accessibilityHint="Введите название товара, например «витамин D3»"
          style={[styles.input, { color: colors.text }]}
        />

        {value.length > 0 ? (
          <Pressable
            onPress={clear}
            hitSlop={CLEAR_HIT}
            accessibilityRole="button"
            accessibilityLabel="Очистить поле поиска"
            style={styles.clear}
          >
            <SymbolView name="xmark.circle.fill" size={18} tintColor={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>

      <PressableScale
        onPress={onCancel}
        haptic="none"
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Закрыть поиск"
        style={styles.cancel}
      >
        <AppText variant="callout" color="brand" weight="600" numberOfLines={1} maxScale={1.4}>
          Отмена
        </AppText>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    // крупное поле: палец попадает в него не глядя, и оно держит текст 17 pt
    minHeight: MIN_TAP_SIZE + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  clear: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  cancel: { minHeight: MIN_TAP_SIZE, justifyContent: "center", paddingHorizontal: spacing.xs },
});
