import { StyleSheet } from "react-native";
import { AppText, Card } from "@/components/ui";
import { spacing } from "@/theme";
import type { RuleGroup } from "./rules";
export function ScanSummary({ pairs, groups }: { pairs: number; groups: readonly RuleGroup[] }) {
  const described = new Set(groups.flatMap(group => group.rules.map(rule => [rule.componentA, rule.componentB].sort().join("|")))).size;
  return <Card style={styles.card}>
    <AppText variant="headline">Выбрано пар: {pairs}</AppText>
    <AppText variant="subhead" color="muted" style={styles.line}>Описано в справочнике: {described}. Недостаточно данных: {Math.max(0, pairs - described)}.</AppText>
    <AppText variant="footnote" color="muted" style={styles.line}>Даже для описанных пар без дозировок нельзя подтвердить безопасность ваших средств.</AppText>
  </Card>;
}
const styles = StyleSheet.create({ card: { marginBottom: spacing.base }, line: { marginTop: spacing.sm } });
