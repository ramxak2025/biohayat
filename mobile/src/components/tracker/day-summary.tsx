/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. */
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { AppText, Card, Divider } from "@/components/ui";
import { plural } from "@/lib/format";
import { Duration, Ease, radii, spacing, Spring, typography, useColors } from "@/theme";

import { AnimatedCount } from "./animated-count";
import { DayRing } from "./day-ring";
import { WeekStrip } from "./week-strip";
import { dayTitle, type DayProgress } from "./plan-utils";

export interface DaySummaryProps {
  day: string;
  today: string;
  progress: DayProgress;
  streak: number;
  days: readonly string[];
  progressOf: (day: string) => DayProgress;
  onSelectDay: (day: string) => void;
}

/** Шапка трекера: кольцо дня, стрик и недельная полоса. */
export function DaySummary({
  day,
  today,
  progress,
  streak,
  days,
  progressOf,
  onSelectDay,
}: DaySummaryProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const { planned, taken } = progress;
  const complete = planned > 0 && taken >= planned;

  const streakPop = useSharedValue(1);
  const streakFlash = useSharedValue(0);
  const prevStreak = useRef(streak);

  useEffect(() => {
    const grew = streak > prevStreak.current;
    prevStreak.current = streak;
    if (!grew || reduced) return;
    // цепочка выросла — это награда, а не уведомление: короткий «поп» и подсвет,
    // оба одноразовые. Никаких пульсаций по кругу.
    streakPop.value = withSequence(withSpring(1.12, Spring.pop), withSpring(1, Spring.press));
    streakFlash.value = withSequence(
      withTiming(1, { duration: Duration.instant, easing: Ease.power2Out }),
      withTiming(0, { duration: Duration.slow, easing: Ease.power2InOut }),
    );
  }, [streak, reduced, streakPop, streakFlash]);

  const streakStyle = useAnimatedStyle(() => ({ transform: [{ scale: streakPop.value }] }));
  // подсвет отдельным слоем поверх плашки: так не падает контраст текста,
  // как было бы при интерполяции фона до полного accent
  const streakFlashStyle = useAnimatedStyle(() => ({ opacity: streakFlash.value * 0.22 }));

  const status =
    planned === 0
      ? "На этот день приёмов не запланировано"
      : complete
        ? "Все приёмы отмечены"
        : `Отмечено ${taken} из ${planned} ${plural(planned, "приёма", "приёмов", "приёмов")}`;

  return (
    <Card padded={spacing.base}>
      <View style={styles.top}>
        <DayRing
          taken={taken}
          planned={planned}
          size={92}
          stroke={9}
          contextKey={day}
          accessibilityLabel={`${dayTitle(day, today)}: ${status}`}
        >
          {complete ? (
            <Animated.View
              entering={reduced ? undefined : ZoomIn.duration(Duration.base).easing(Ease.backOut)}
            >
              <SymbolView name="checkmark" size={30} tintColor={colors.success} weight="semibold" />
            </Animated.View>
          ) : (
            <View style={styles.ringLabel}>
              {/* число доезжает вместе с кольцом: одна длительность, одна кривая */}
              <AnimatedCount
                value={taken}
                duration={Duration.reveal}
                easing={Ease.power3Out}
                maxScale={1.2}
                style={[styles.ringCount, { color: colors.text }]}
              />
              <AppText variant="footnote" color="faint" weight="600" maxScale={1.2}>
                из {planned}
              </AppText>
            </View>
          )}
        </DayRing>

        <View style={styles.info}>
          <AppText variant="title3">{dayTitle(day, today)}</AppText>
          <AppText variant="subhead" color="muted">
            {status}
          </AppText>

          {streak > 0 ? (
            <Animated.View
              style={[styles.streak, { backgroundColor: colors.accentSoft }, streakStyle]}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: colors.accent },
                  streakFlashStyle,
                ]}
              />
              <SymbolView name="flame.fill" size={13} tintColor={colors.accent} />
              <AppText variant="footnote" color="accent" weight="700">
                {streak} {plural(streak, "день", "дня", "дней")} подряд
              </AppText>
            </Animated.View>
          ) : null}
        </View>
      </View>

      <Divider style={styles.divider} />

      <WeekStrip
        days={days}
        selected={day}
        today={today}
        onSelect={onSelectDay}
        progressOf={progressOf}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: spacing.base },
  ringLabel: { alignItems: "center" },
  // ширину и высоту задаём явно: TextInput не измеряет себя по контенту
  ringCount: {
    fontSize: typography.title1.fontSize,
    fontWeight: "700",
    width: 66,
    height: typography.title1.lineHeight + 2,
  },
  info: { flex: 1, gap: spacing.xs, alignItems: "flex-start" },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    marginTop: 2,
    overflow: "hidden",
  },
  divider: { marginVertical: spacing.base },
});
