import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { AppText, Badge } from "@/components/ui";
import { Duration, Ease, radii, spacing, staggerDelay } from "@/theme";

import { RuleCard } from "./rule-card";
import type { RuleGroup } from "./rules";
import { GROUP_META, useGroupTones } from "./tone";

/** Пауза между группами: каскад должен читаться как «блок за блоком», а не как рассыпанный список. */
const GROUP_STEP = 140;
/** Секция-результат появляется чуть позже счётчика — сначала цифра, потом разбор. */
const CASCADE_START = 40;
/** Карточки идут после своего заголовка. */
const HEADER_TO_CARDS = 70;

export interface RuleGroupBlockProps {
  group: RuleGroup;
  /** Порядковый номер группы — задаёт её такт в каскаде. */
  groupIndex: number;
}

export function RuleGroupBlock({ group, groupIndex }: RuleGroupBlockProps) {
  const reduced = useReducedMotion();
  const tones = useGroupTones();
  const meta = GROUP_META[group.type];
  const { tint, soft } = tones[group.type];

  const headerDelay = CASCADE_START + groupIndex * GROUP_STEP;

  return (
    <View style={styles.group}>
      <Animated.View
        entering={
          reduced
            ? undefined
            : FadeInDown.duration(Duration.base).easing(Ease.power3Out).delay(headerDelay)
        }
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: soft }]}>
            <SymbolView name={meta.icon} size={15} tintColor={tint} />
          </View>
          <AppText variant="headline" style={styles.headerTitle}>
            {meta.title}
          </AppText>
          <Badge label={String(group.rules.length)} tone={meta.badge} size="sm" solid />
        </View>

        <AppText variant="footnote" color="muted" style={styles.hint}>
          {meta.hint}
        </AppText>
      </Animated.View>

      {group.rules.map((rule, index) => (
        <RuleCard
          key={rule.id}
          rule={rule}
          type={group.type}
          tint={tint}
          soft={soft}
          icon={meta.icon}
          groupTitle={meta.title}
          delay={headerDelay + HEADER_TO_CARDS + staggerDelay(index, 60, 6)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { flex: 1 },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { marginTop: spacing.xs },
});
