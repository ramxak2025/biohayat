import { SafeAreaView, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { AppText } from "./app-text";
import { Button } from "./button";
import { radii, spacing, useColors } from "@/theme";

export interface AppErrorScreenProps {
  error: Error;
  onRetry: () => void;
}

/**
 * Экран непредвиденной ошибки. Текст ошибки показываем: это внутреннее
 * тестирование, и «что-то пошло не так» без подробностей бесполезно тому,
 * кто будет заводить баг.
 */
export function AppErrorScreen({ error, onRetry }: AppErrorScreenProps) {
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <View style={[styles.icon, { backgroundColor: colors.surfaceSunken }]}>
          <SymbolView name="exclamationmark.triangle" size={26} tintColor={colors.warning} />
        </View>
        <AppText variant="title3" style={styles.title}>
          Что-то пошло не так
        </AppText>
        <AppText variant="subhead" color="muted" style={styles.text}>
          Приложение столкнулось с ошибкой и остановило этот экран. Данные и корзина не потеряны.
        </AppText>
        <View style={[styles.details, { backgroundColor: colors.surfaceSunken }]}>
          <AppText variant="caption" color="faint" numberOfLines={6}>
            {error?.message || String(error)}
          </AppText>
        </View>
        <Button title="Попробовать снова" onPress={onRetry} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  icon: { width: 64, height: 64, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  title: { textAlign: "center" },
  text: { textAlign: "center" },
  details: { alignSelf: "stretch", padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.sm },
});
