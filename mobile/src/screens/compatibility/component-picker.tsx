/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. Правило React Compiler
 * про shared values не знает; в рендере `.value` мы не читаем. */
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { AppText, Chip, Input } from "@/components/ui";
import { Duration, Ease, spacing, staggerDelay } from "@/theme";

import { matchesQuery, normalizeComponent } from "./rules";

/** Ниже этого числа поиск только мешает — все чипсы и так на экране. */
const SEARCH_THRESHOLD = 10;
/** Шаг прилёта чипсов из курсов; выше восьмого ждать бессмысленно. */
const IMPORT_STEP = 80;
const IMPORT_CAP = 8;

export interface ComponentPickerProps {
  components: readonly string[];
  /** Нормализованные ключи выбранных компонентов. */
  selectedKeys: ReadonlySet<string>;
  /** Ключ → порядок прилёта для компонентов, только что подставленных из курсов. */
  importedRanks?: ReadonlyMap<string, number>;
  onToggle: (name: string) => void;
}

/**
 * Поиск по словарю + чипсы-тогглы. Выбор ничего не запрашивает — вся логика локальная.
 *
 * Выбранные переезжают в начало списка: это движение, а не перерисовка, поэтому
 * видно, что именно ты набрал, и набор не теряется среди трёх десятков чипсов.
 */
export function ComponentPicker({
  components,
  selectedKeys,
  importedRanks,
  onToggle,
}: ComponentPickerProps) {
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () => components.filter((name) => matchesQuery(name, query)),
    [components, query],
  );

  /** Стабильная перестановка: словарь уже отсортирован по-русски, внутри групп порядок сохраняется. */
  const ordered = useMemo(() => {
    const picked: string[] = [];
    const rest: string[] = [];
    for (const name of visible) {
      if (selectedKeys.has(normalizeComponent(name))) picked.push(name);
      else rest.push(name);
    }
    return [...picked, ...rest];
  }, [visible, selectedKeys]);

  return (
    <View>
      {components.length >= SEARCH_THRESHOLD ? (
        <Input
          value={query}
          onChangeText={setQuery}
          leftIcon="magnifyingglass"
          placeholder="Найти компонент"
          accessibilityLabel="Поиск компонента"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          containerStyle={styles.search}
        />
      ) : null}

      {ordered.length === 0 ? (
        <AppText variant="subhead" color="muted" style={styles.nothing}>
          Компонент «{query.trim()}» не найден. Попробуйте другое написание.
        </AppText>
      ) : (
        <View style={styles.chips}>
          {ordered.map((name) => (
            <PickerChip
              key={name}
              name={name}
              selected={selectedKeys.has(normalizeComponent(name))}
              rank={importedRanks?.get(normalizeComponent(name))}
              onToggle={onToggle}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface PickerChipProps {
  name: string;
  selected: boolean;
  /** Позиция в очереди прилёта из курсов; undefined — обычный чипс. */
  rank: number | undefined;
  onToggle: (name: string) => void;
}

/**
 * Один чипс. Сам выбор (цвет + пружина + хаптика) живёт в дизайн-системном `Chip`;
 * здесь — только его место в списке и «посадка» при импорте из курсов.
 *
 * Импортированные едут в начало не все разом, а друг за другом: задержка стоит
 * и на переезде (`LinearTransition.delay`), и на «попе» — так видно, ЧТО именно
 * подставилось, а не просто что список дёрнулся. При Reduce Motion переезд
 * мгновенный, а вместо «попа» остаётся короткое мигание прозрачностью —
 * подсказка сохраняется, движение уходит.
 */
function PickerChip({ name, selected, rank, onToggle }: PickerChipProps) {
  const reduced = useReducedMotion();
  const flash = useSharedValue(0);
  const delay = rank === undefined ? 0 : staggerDelay(rank, IMPORT_STEP, IMPORT_CAP);

  useEffect(() => {
    if (rank === undefined) return;
    flash.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: Duration.instant, easing: Ease.power2Out }),
        withTiming(0, { duration: Duration.base, easing: Ease.power2InOut }),
      ),
    );
  }, [rank, delay, flash]);

  const landing = useAnimatedStyle(() =>
    reduced
      ? { opacity: 1 - flash.value * 0.45 }
      : { transform: [{ scale: 1 + flash.value * 0.07 }] },
  );

  return (
    <Animated.View
      layout={
        reduced
          ? undefined
          : LinearTransition.duration(Duration.base).easing(Ease.power2Out).delay(delay)
      }
      entering={reduced ? undefined : FadeIn.duration(Duration.fast)}
      style={landing}
    >
      <Chip label={name} selected={selected} onPress={() => onToggle(name)} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  search: { marginBottom: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  nothing: { paddingVertical: spacing.lg },
});
