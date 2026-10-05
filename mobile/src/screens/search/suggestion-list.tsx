import { ScrollView, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import type { SearchSuggestion } from "@/api/types";
import { AppText, Divider, ErrorState, PressableScale, Skeleton } from "@/components/ui";
import { Duration, MIN_TAP_SIZE, spacing, useColors } from "@/theme";

export interface SuggestionListProps {
  /** Текущий ввод: по нему подписываем строку «Искать …». */
  query: string;
  /** Запрос, под который реально получены подсказки: по нему подсвечиваем совпадение. */
  matched: string;
  items: SearchSuggestion[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onPressSuggestion: (item: SearchSuggestion) => void;
  onShowAll: () => void;
  bottomInset: number;
}

/** Отступ разделителя = поле экрана + иконка + зазор: линия начинается под текстом. */
const DIVIDER_INSET = spacing.base + 18 + spacing.md;

/**
 * Подсветка совпадения: набранные буквы внутри названия даём жирным и брендовым
 * цветом — сразу видно, за что зацепился поиск.
 *
 * Подсказки на сервере нечёткие: на «кол» приходит и «Кордексин», где такой
 * подстроки нет вовсе. Тогда показываем название как есть — рисовать подсветку
 * там, где совпадения не было, значит врать.
 */
function SuggestionName({ name, query }: { name: string; query: string }) {
  const at = query.length > 0 ? name.toLowerCase().indexOf(query.toLowerCase()) : -1;

  if (at < 0) {
    return (
      <AppText variant="callout" numberOfLines={1}>
        {name}
      </AppText>
    );
  }

  return (
    <AppText variant="callout" numberOfLines={1}>
      {name.slice(0, at)}
      <AppText variant="callout" weight="700" color="brand">
        {name.slice(at, at + query.length)}
      </AppText>
      {name.slice(at + query.length)}
    </AppText>
  );
}

function SuggestionSkeletons() {
  return (
    <View>
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} style={styles.row}>
          <Skeleton width={18} height={18} radius={9} />
          <Skeleton width={`${72 - row * 7}%`} height={15} />
        </View>
      ))}
    </View>
  );
}

/**
 * Живые подсказки с первых букв. Тап по строке уводит сразу в карточку товара —
 * это самый короткий путь: пользователь уже увидел нужное название, показывать
 * ему ради этого целую выдачу незачем.
 *
 * Первой строкой — переход в полную выдачу по набранному тексту: так устроены
 * все привычные поиски, и рядом с полем эта цель самая досягаемая.
 */
export function SuggestionList({
  query,
  matched,
  items,
  isLoading,
  error,
  onRetry,
  onPressSuggestion,
  onShowAll,
  bottomInset,
}: SuggestionListProps) {
  const colors = useColors();
  const reduced = useReducedMotion();

  if (error && items.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <ErrorState error={error} onRetry={onRetry} compact />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      // подсказку нажимают, не закрывая клавиатуру — иначе теряется темп ввода
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="none"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomInset + spacing["2xl"] }}
    >
      <View style={{ backgroundColor: colors.surface }}>
        <PressableScale
          onPress={onShowAll}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel={`Найти все товары по запросу ${query}`}
          style={styles.row}
        >
          <SymbolView name="text.magnifyingglass" size={17} tintColor={colors.brand} weight="semibold" />
          <AppText variant="callout" color="brand" weight="600" numberOfLines={1} style={styles.rowBody}>
            {`Найти «${query}»`}
          </AppText>
          <SymbolView name="chevron.right" size={12} tintColor={colors.brand} weight="semibold" />
        </PressableScale>

        <Divider inset={DIVIDER_INSET} />

        {isLoading && items.length === 0 ? (
          <SuggestionSkeletons />
        ) : items.length === 0 ? (
          <View style={styles.hint}>
            <AppText variant="footnote" color="muted">
              Точных подсказок нет — полный поиск понимает и опечатки.
            </AppText>
          </View>
        ) : (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(Duration.fast)}>
            {items.map((item, index) => (
              <View key={item.slug}>
                {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
                <PressableScale
                  onPress={() => onPressSuggestion(item)}
                  haptic="light"
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}. Открыть товар`}
                  style={styles.row}
                >
                  <SymbolView name="magnifyingglass" size={17} tintColor={colors.textFaint} />
                  <View style={styles.rowBody}>
                    <SuggestionName name={item.name} query={matched} />
                  </View>
                  <SymbolView name="chevron.right" size={12} tintColor={colors.textFaint} weight="semibold" />
                </PressableScale>
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stateWrap: { flex: 1, paddingHorizontal: spacing.base, paddingTop: spacing.base },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: MIN_TAP_SIZE + 4,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  rowBody: { flex: 1 },
  hint: { paddingHorizontal: spacing.base, paddingVertical: spacing.base },
});
