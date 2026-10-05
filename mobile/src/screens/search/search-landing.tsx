import { type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";

import { AppText, Chip, ErrorState, SectionHeader, Skeleton } from "@/components/ui";
import { useCategories } from "@/hooks/use-products";
import { Duration, Ease, MIN_TAP_SIZE, radii, spacing, staggerDelay } from "@/theme";

import { LANDING_CATEGORIES } from "./constants";
import { HistoryChip } from "./history-chip";

export interface SearchLandingProps {
  history: string[];
  onPickQuery: (query: string) => void;
  onForget: (query: string) => void;
  onClearHistory: () => void;
  onOpenCategory: (slug: string) => void;
  bottomInset: number;
}

function Section({ index, children }: { index: number; children: ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.delay(staggerDelay(index, 60, 3)).duration(Duration.reveal).easing(Ease.power3Out)
      }
      style={styles.section}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Экран до ввода. Пустым он быть не должен: сначала история запросов, затем
 * категории из API — с них начинается больше сессий, чем с набора текста.
 *
 * Выдуманных «популярных запросов» здесь нет сознательно: такой статистики
 * бэкенд не отдаёт, а зашитый в код список — это картинка, а не данные.
 */
export function SearchLanding({
  history,
  onPickQuery,
  onForget,
  onClearHistory,
  onOpenCategory,
  bottomInset,
}: SearchLandingProps) {
  const categories = useCategories();
  const reduced = useReducedMotion();

  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onClearHistory();
  };

  const popular = (categories.data ?? []).slice(0, LANDING_CATEGORIES);

  return (
    <ScrollView
      style={styles.flex}
      // тап по чипсу не должен сначала «съедаться» закрытием клавиатуры
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + spacing["2xl"] }]}
    >
      {history.length > 0 ? (
        <Section index={0}>
          <SectionHeader title="Вы искали" actionLabel="Очистить всё" onAction={clearAll} />
          <View style={styles.chips}>
            {history.map((query) => (
              <Animated.View
                key={query}
                // удалённый чипс уходит плавно, соседние подтягиваются — иначе ряд «прыгает»
                layout={reduced ? undefined : LinearTransition.duration(Duration.base)}
                exiting={reduced ? undefined : FadeOut.duration(Duration.instant)}
                style={styles.chipWrap}
              >
                <HistoryChip
                  query={query}
                  onPress={() => onPickQuery(query)}
                  onRemove={() => onForget(query)}
                />
              </Animated.View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section index={history.length > 0 ? 1 : 0}>
        {categories.isLoading || popular.length > 0 ? (
          <SectionHeader title="Популярные категории" />
        ) : null}

        {categories.isLoading ? (
          <View style={styles.chips}>
            {[112, 96, 140, 120, 88, 132].map((width, index) => (
              <Skeleton key={index} width={width} height={MIN_TAP_SIZE - 8} radius={radii.pill} />
            ))}
          </View>
        ) : categories.error ? (
          <ErrorState error={categories.error} onRetry={categories.refetch} compact />
        ) : popular.length > 0 ? (
          <View style={styles.chips}>
            {popular.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                icon="square.grid.2x2"
                onPress={() => onOpenCategory(category.slug)}
              />
            ))}
          </View>
        ) : (
          // крайний случай: истории нет и категорий сервер не дал — пустой экран
          // без единой подсказки выглядел бы поломкой
          <AppText variant="subhead" color="muted">
            Начните вводить название — подсказки появятся с первых букв.
          </AppText>
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.base, paddingTop: spacing.xs },
  section: { marginBottom: spacing.xl },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  // ширину ограничиваем здесь: длинный запрос обрезается, а не ломает ряд
  chipWrap: { maxWidth: "100%" },
});
