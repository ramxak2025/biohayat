import { StyleSheet, Switch, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { AppText, Card } from "@/components/ui";
import { plural } from "@/lib/format";
import { radii, spacing, useColors } from "@/theme";

import type { RemindersState } from "./use-reminders";

export interface RemindersCardProps {
  /** Состояние из useIntakeReminders — живёт на экране, а не в карточке:
   *  расписание нужно пересобирать и тогда, когда карточка не показана. */
  state: RemindersState;
}

/** Тумблер локальных напоминаний. Разрешение запрашивается только по нажатию. */
export function RemindersCard({ state }: RemindersCardProps) {
  const colors = useColors();
  const { enabled, permission, scheduled, busy, toggle } = state;

  const subtitle = !enabled
    ? permission === "denied"
      ? "Уведомления запрещены в системных настройках"
      : "Напомним, когда придёт время приёма"
    : scheduled > 0
      ? `${scheduled} ${plural(scheduled, "напоминание", "напоминания", "напоминаний")} в день`
      : "Добавьте курс — и напоминания появятся";

  return (
    <Card padded={spacing.base}>
      <View style={styles.row}>
        <View
          style={[
            styles.icon,
            { backgroundColor: enabled ? colors.brandSoft : colors.surfaceSunken },
          ]}
        >
          <SymbolView
            name={enabled ? "bell.badge.fill" : "bell.slash"}
            size={17}
            tintColor={enabled ? colors.brand : colors.textFaint}
          />
        </View>

        <View style={styles.text}>
          <AppText variant="headline">Напоминания</AppText>
          <AppText variant="footnote" color="muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        </View>

        <Switch
          value={enabled}
          onValueChange={toggle}
          disabled={busy}
          trackColor={{ true: colors.brand, false: colors.surfaceSunken }}
          accessibilityLabel="Напоминания о приёме"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
});
