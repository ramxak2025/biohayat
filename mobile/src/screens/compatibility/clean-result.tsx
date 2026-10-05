import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { AppText, Card } from "@/components/ui";
import { spacing, useColors } from "@/theme";

const TITLE = "В базе нет сведений об этой комбинации.";
const DESCRIPTION = "Это не подтверждает безопасность совместного приёма.";

/** Отсутствие сведений — неопределённый результат, без сигнала успешной проверки. */
export function CleanResult() {
  const colors = useColors();

  return (
    <Card tone="soft" elevated={false} padded={spacing.xl} style={styles.card}>
      <View accessible accessibilityLabel={`${TITLE} ${DESCRIPTION}`}>
        <View style={styles.icon}>
          <SymbolView name="info.circle" size={32} tintColor={colors.textMuted} />
        </View>
        <AppText variant="title3" align="center" style={styles.title}>
          {TITLE}
        </AppText>
        <AppText variant="subhead" color="muted" align="center">
          {DESCRIPTION}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center" },
  icon: { alignItems: "center", marginBottom: spacing.md },
  title: { marginBottom: spacing.sm },
});
