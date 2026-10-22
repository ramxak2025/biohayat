import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import type { Customer } from "@/api/types";
import { AppText, Button, Card } from "@/components/ui";
import { formatPhone } from "@/lib/format";
import { Duration, Ease, radii, spacing, useColors } from "@/theme";

export interface AccountHeroProps {
  customer: Customer | null;
  onSignIn: () => void;
  onOpenProfile: () => void;
}

/** Первая буква имени для аватара; для пустого имени — нейтральный знак. */
function initial(name: string): string {
  const letter = name.trim().charAt(0);
  return letter ? letter.toUpperCase() : "•";
}

/** Шапка кабинета: приветствие вошедшего либо приглашение войти для гостя. */
export function AccountHero({ customer, onSignIn, onOpenProfile }: AccountHeroProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const entering = reduced
    ? undefined
    : FadeInDown.duration(Duration.reveal).easing(Ease.power3Out);

  if (!customer) {
    return (
      <Animated.View entering={entering}>
        <Card tone="surface" padded={spacing.base}>
          <View style={styles.guestTop}>
            <View style={[styles.avatar, styles.guestAvatar, { backgroundColor: colors.brandSoft }]}>
              <SymbolView name="person.crop.circle" size={28} tintColor={colors.brand} />
            </View>
            <View style={styles.guestTitles}>
              <AppText variant="title3">Войдите в кабинет</AppText>
              <AppText variant="subhead" color="muted" style={styles.guestSubtitle}>
                Заказы, избранное, курсы приёма и консультации — в одном месте.
              </AppText>
            </View>
          </View>

          <Button
            title="Войти или зарегистрироваться"
            onPress={onSignIn}
            size="md"
            fullWidth
            style={styles.guestAction}
          />
        </Card>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={entering}>
      <Card
        onPress={onOpenProfile}
        accessibilityLabel={`${customer.name}, ${formatPhone(customer.phone)}. Открыть профиль`}
        padded={spacing.lg}
      >
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: colors.brandSoft }]}>
            <AppText variant="title2" color="brand" weight="700" maxScale={1.2}>
              {initial(customer.name)}
            </AppText>
          </View>

          <View style={styles.titles}>
            <AppText variant="title3" numberOfLines={1}>
              {customer.name}
            </AppText>
            <AppText variant="subhead" color="muted" numberOfLines={1}>
              {formatPhone(customer.phone)}
            </AppText>
          </View>

          <SymbolView name="chevron.right" size={13} tintColor={colors.textFaint} weight="semibold" />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.base },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  titles: { flex: 1, gap: 2 },
  guestAvatar: { width: 48, height: 48 },
  guestTop: { flexDirection: "row", alignItems: "center", gap: spacing.base },
  guestTitles: { flex: 1 },
  guestSubtitle: { marginTop: 2 },
  guestAction: { marginTop: spacing.base },
});
