import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { AppText, Button, Card, Screen } from "@/components/ui";
import { Duration, Ease, radii, spacing, staggerDelay, useColors } from "@/theme";

const BENEFITS: { icon: SFSymbol; title: string; text: string }[] = [
  {
    icon: "bell.badge.fill",
    title: "Напоминания в нужный час",
    text: "Уведомление приходит ко времени приёма, отметить можно прямо из него.",
  },
  {
    icon: "chart.bar.fill",
    title: "Видно прогресс",
    text: "Кольцо дня, неделя и счётчик дней подряд — курс легко довести до конца.",
  },
  {
    icon: "checkmark.seal.fill",
    title: "История сохраняется",
    text: "Отметки привязаны к личному кабинету и не потеряются при смене телефона.",
  },
];

export interface AuthInviteProps {
  title?: string;
  subtitle?: string;
}

/** Трекер работает только с Bearer-сессией — объясняем зачем входить, а не просто «нужен вход». */
export function AuthInvite({
  title = "Трекер приёма",
  subtitle = "Курсы и отметки хранятся в личном кабинете, поэтому для трекера нужен вход.",
}: AuthInviteProps) {
  const router = useRouter();
  const colors = useColors();
  const reduced = useReducedMotion();

  return (
    <Screen scroll>
      <Animated.View
        entering={reduced ? undefined : FadeInDown.duration(Duration.reveal).easing(Ease.power3Out)}
        style={styles.hero}
      >
        <View style={[styles.heroIcon, { backgroundColor: colors.brandSoft }]}>
          <SymbolView name="pills.fill" size={34} tintColor={colors.brand} />
        </View>
        <AppText variant="title2" align="center">
          {title}
        </AppText>
        <AppText variant="subhead" color="muted" align="center">
          {subtitle}
        </AppText>
      </Animated.View>

      <View style={styles.list}>
        {BENEFITS.map((item, index) => (
          <Animated.View
            key={item.title}
            entering={
              reduced
                ? undefined
                : FadeInDown.duration(Duration.reveal)
                    .easing(Ease.power3Out)
                    .delay(staggerDelay(index + 1))
            }
          >
            <Card padded={spacing.base}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: colors.surfaceSunken }]}>
                  <SymbolView name={item.icon} size={17} tintColor={colors.brand} />
                </View>
                <View style={styles.rowText}>
                  <AppText variant="headline">{item.title}</AppText>
                  <AppText variant="footnote" color="muted">
                    {item.text}
                  </AppText>
                </View>
              </View>
            </Card>
          </Animated.View>
        ))}
      </View>

      <Button
        title="Войти в личный кабинет"
        size="lg"
        fullWidth
        leftIcon="person.crop.circle"
        onPress={() => router.push("/auth" as Href)}
        style={styles.action}
      />
      <AppText variant="footnote" color="faint" align="center" style={styles.hint}>
        Регистрация занимает меньше минуты — нужен только номер телефона.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  action: { marginTop: spacing.xl },
  hint: { marginTop: spacing.md },
});
