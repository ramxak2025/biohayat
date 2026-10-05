/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. Правило React Compiler
 * про shared values не знает; в рендере `.value` мы не читаем. */
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { type SFSymbol } from "expo-symbols";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import type { CompatibilityRule, CompatibilityType } from "@/api/types";
import { AppText, Card } from "@/components/ui";
import { Duration, Ease, radii, spacing } from "@/theme";

import { PairLink } from "./pair-link";

export interface RuleCardProps {
  rule: CompatibilityRule;
  type: CompatibilityType;
  tint: string;
  soft: string;
  icon: SFSymbol;
  /** Заголовок группы — он же часть подписи карточки для VoiceOver. */
  groupTitle: string;
  /** Сквозная задержка каскада: группа + позиция внутри группы. */
  delay: number;
}

/**
 * Карточка правила: два компонента и связь между ними.
 *
 * Раньше пара была строкой «А + Б». Связь рисуется дугой, потому что клиент
 * называет экран «таблицей совместимости»: пара должна читаться как отношение,
 * а не как перечисление. Цвет дуги равен цвету группы — он и есть ответ.
 */
export function RuleCard({ rule, type, tint, soft, icon, groupTitle, delay }: RuleCardProps) {
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.duration(Duration.reveal).easing(Ease.power3Out).delay(delay)
      }
    >
      <Card
        padded={spacing.base}
        elevated={false}
        radius={radii.lg}
        style={[styles.card, { borderLeftColor: tint }]}
      >
        <View
          accessible
          accessibilityLabel={`${rule.componentA} и ${rule.componentB}. ${groupTitle}. ${rule.note ?? ""}`}
        >
          <View style={styles.pair}>
            <AppText
              variant="callout"
              weight="600"
              align="right"
              numberOfLines={2}
              style={styles.component}
            >
              {rule.componentA}
            </AppText>

            <PairLink tint={tint} soft={soft} icon={icon} delay={delay} />

            <AppText
              variant="callout"
              weight="600"
              align="left"
              numberOfLines={2}
              style={styles.component}
            >
              {rule.componentB}
            </AppText>
          </View>

          {rule.note ? (
            <AppText variant="footnote" color="muted" style={styles.note}>
              {rule.note}
            </AppText>
          ) : null}
        </View>

        {type === "ANTAGONIST" ? <ConflictPulse tint={tint} delay={delay + 160} /> : null}
      </Card>
    </Animated.View>
  );
}

interface ConflictPulseProps {
  tint: string;
  delay: number;
}

/**
 * Однократный пульс границы у красной карточки.
 *
 * Зацикленную анимацию HIG прямо не советует («avoid adding motion to UI
 * interactions that occur frequently»), но конфликт нельзя пролистать мимо —
 * поэтому ровно один импульс на появление. Рамка вынесена в отдельный слой
 * с `pointerEvents="none"`: анимировать `borderWidth` самой карточки нельзя,
 * это пересчёт лейаута на каждом кадре.
 */
function ConflictPulse({ tint, delay }: ConflictPulseProps) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: Duration.fast, easing: Ease.power2Out }),
        withTiming(0, { duration: Duration.slow, easing: Ease.power2InOut }),
      ),
    );
  }, [delay, pulse]);

  // при Reduce Motion остаётся вспышка цвета без «дыхания» рамки: сигнал есть, движения нет
  const style = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.9,
    transform: [{ scale: reduced ? 1 : 1 + pulse.value * 0.02 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.pulse, { borderColor: tint }, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderLeftWidth: 3 },
  pair: { flexDirection: "row", alignItems: "center" },
  component: { flex: 1 },
  note: { marginTop: spacing.sm },
  pulse: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: radii.lg + 2,
    borderWidth: 2,
  },
});
