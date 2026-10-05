/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. Правило React Compiler
 * про shared values не знает; в рендере `.value` мы не читаем. */
import { useEffect, type ComponentType } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import Animated, {
  LinearTransition,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { AppText, Card } from "@/components/ui";
import { plural } from "@/lib/format";
import { Duration, Ease, radii, spacing, useColors } from "@/theme";

import type { RuleGroup } from "./rules";
import { GROUP_META, useGroupTones } from "./tone";

/**
 * `text` — нативный проп TextInput: он меняет подпись, не трогая React-дерево.
 * Именно поэтому счётчик крутится на UI-потоке, а не через setState на каждый кадр.
 * В публичных типах RN его нет, поэтому объявляем сами.
 */
interface CounterInputProps extends TextInputProps {
  text?: string;
}

const AnimatedCounter = Animated.createAnimatedComponent(
  TextInput as ComponentType<CounterInputProps>,
);

/** Полоска-итог стартует после того, как цифра успела «зацепить» взгляд. */
const BAR_DELAY = 160;
const BAR_STEP = 90;

export interface ScanSummaryProps {
  /** Сколько пар проверено: C(n, 2). */
  pairs: number;
  groups: readonly RuleGroup[];
}

/**
 * Шапка результата: «N связей проверено» + состав найденного.
 *
 * Цифра докручивается, а не подставляется: это единственный способ показать,
 * что при добавлении компонента проверка выросла нелинейно (4 компонента — 6 пар,
 * 5 — уже 10). Полоска рядом — не прогресс загрузки, а состав: сколько из
 * проверенных пар вообще описаны в базе и какими они оказались.
 */
export function ScanSummary({ pairs, groups }: ScanSummaryProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const tones = useGroupTones();

  const matched = groups.reduce((sum, group) => sum + group.rules.length, 0);
  const rest = Math.max(0, pairs - matched);

  const counter = useSharedValue(reduced ? pairs : 0);

  useEffect(() => {
    counter.value = reduced
      ? pairs
      : withTiming(pairs, { duration: Duration.slow, easing: Ease.power3Out });
  }, [pairs, reduced, counter]);

  const counterProps = useAnimatedProps<CounterInputProps>(() => ({
    text: `${Math.round(counter.value)}`,
  }));

  const found = `${matched} ${plural(matched, "взаимодействие", "взаимодействия", "взаимодействий")}`;
  const caption = matched > 0 ? `${found} в нашей базе` : "нет сведений об этих сочетаниях";
  const voiceOver = `Проверено ${pairs} ${plural(pairs, "пара", "пары", "пар")}. ${
    matched > 0 ? `Найдено ${found}` : "В базе нет сведений об этих сочетаниях. Это не подтверждает безопасность совместного приёма"
  }.`;

  return (
    <Card radius={radii["2xl"]} style={styles.card}>
      <View accessible accessibilityLabel={voiceOver}>
        <View style={styles.row}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
          >
            <AnimatedCounter
              editable={false}
              defaultValue={`${reduced ? pairs : 0}`}
              animatedProps={counterProps}
              maxFontSizeMultiplier={1.3}
              style={[styles.counter, { color: colors.text }]}
            />
          </View>

          <View style={styles.labels}>
            <AppText variant="headline">
              {plural(pairs, "связь проверена", "связи проверено", "связей проверено")}
            </AppText>
            <AppText variant="footnote" color="muted" style={styles.caption}>
              {caption}
            </AppText>
          </View>
        </View>

        <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
          {groups.map((group, index) => (
            <BarSegment
              key={group.type}
              count={group.rules.length}
              tint={tones[group.type].tint}
              index={index}
            />
          ))}
          {/* остаток — пары без известных взаимодействий; он просто держит масштаб */}
          <View style={{ flexGrow: rest, flexBasis: 0 }} />
        </View>

        {matched > 0 ? (
          <View style={styles.legend}>
            {groups.map((group) => (
              <View key={group.type} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: tones[group.type].tint }]} />
                <AppText variant="caption" color="muted">
                  {`${GROUP_META[group.type].short} · ${group.rules.length}`}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

interface BarSegmentProps {
  count: number;
  tint: string;
  index: number;
}

/**
 * Сегмент полоски. Растёт `scaleX` с `transformOrigin: left`, а не шириной:
 * ширина — это пересчёт лейаута на каждом кадре, трансформ живёт на UI-потоке.
 * `LinearTransition` берёт на себя смену пропорций, когда пользователь добавляет
 * компонент и состав найденного меняется.
 */
function BarSegment({ count, tint, index }: BarSegmentProps) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    grow.value = reduced
      ? 1
      : withDelay(
          BAR_DELAY + index * BAR_STEP,
          withTiming(1, { duration: Duration.reveal, easing: Ease.power3Out }),
        );
  }, [index, reduced, grow]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.value }] }));

  return (
    <Animated.View
      layout={reduced ? undefined : LinearTransition.duration(Duration.base).easing(Ease.power2Out)}
      style={[styles.segment, { flexGrow: count, backgroundColor: tint }, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.base },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  counter: {
    // фиксированная ширина под 2 разряда: цифра докручивается, а подпись рядом не ездит
    minWidth: 52,
    height: 42,
    padding: 0,
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
    // табличные цифры: при докрутке ширина разряда не пляшет
    fontVariant: ["tabular-nums"],
  },
  labels: { flex: 1 },
  caption: { marginTop: 2 },

  track: {
    flexDirection: "row",
    gap: 2,
    height: 10,
    borderRadius: radii.pill,
    overflow: "hidden",
    marginTop: spacing.base,
  },
  segment: {
    flexBasis: 0,
    minWidth: 14,
    borderRadius: radii.pill,
    transformOrigin: "left center",
  },

  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  dot: { width: 7, height: 7, borderRadius: radii.pill },
});
