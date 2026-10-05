import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { AppText } from "@/components/ui";
import { formatKopecks } from "@/lib/format";
import { Duration, Ease, radii, shadows, spacing, useColors } from "@/theme";

export interface BonusCardProps {
  balance: number;
}

/**
 * Бонусный счёт. API баллы только показывает — не начисляет и не списывает,
 * поэтому в подписи честно объясняем, что списание делает менеджер.
 */
export function BonusCard({ balance }: BonusCardProps) {
  const colors = useColors();
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.delay(60).duration(Duration.reveal).easing(Ease.power3Out)}
      style={[styles.shadow, { backgroundColor: colors.brand }]}
    >
      <LinearGradient
        colors={[colors.brand, colors.brandPressed]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <SymbolView name="gift.fill" size={15} tintColor={colors.textOnBrand} />
          <AppText variant="footnote" color="onBrand" weight="600" style={styles.label}>
            Бонусный счёт
          </AppText>
        </View>

        <AppText variant="largeTitle" color="onBrand" weight="800" maxScale={1.3}>
          {formatKopecks(balance)}
        </AppText>

        <AppText variant="footnote" color="onBrand" style={styles.note}>
          Баланс общий с сайтом. Возможность списания бонусов при заказе
          в приложении уточните у менеджера.
        </AppText>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // тень рисуется от непрозрачной подложки: у самого градиента её нет
  shadow: { borderRadius: radii["2xl"], ...shadows.sm },
  card: { borderRadius: radii["2xl"], padding: spacing.lg, gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { opacity: 0.9 },
  note: { opacity: 0.85 },
});
