import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";

import {
  AppText,
  BadDisclaimer,
  Badge,
  Button,
  Divider,
  EmptyState,
  Screen,
  useDetailScreenOptions,
} from "@/components/ui";
import { formatKopecks } from "@/lib/format";
import { useIsAuthenticated } from "@/store/auth";
import { radii, spacing, useColors } from "@/theme";

import { Celebration } from "./celebration";

interface Step {
  icon: SFSymbol;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    icon: "phone.badge.checkmark",
    title: "Звонок менеджера",
    text: "Подтвердим состав заказа, адрес и удобное время доставки.",
  },
  {
    icon: "shippingbox",
    title: "Сборка и отправка",
    text: "Соберём заказ и передадим в доставку. Трек-номер появится в карточке заказа.",
  },
  {
    icon: "creditcard",
    title: "Оплата при получении",
    text: "Платите, когда заказ у вас на руках. Предоплата не нужна.",
  },
];

/** Параметры маршрута приходят как string | string[] — берём первое значение. */
const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export function OrderSuccessScreen() {
  const colors = useColors();
  const router = useRouter();
  const detailOptions = useDetailScreenOptions();
  const isAuthenticated = useIsAuthenticated();
  const params = useLocalSearchParams();

  const number = first(params.number);
  const status = first(params.status);
  const totalRaw = first(params.total);
  const total = totalRaw ? Number(totalRaw) : Number.NaN;

  useEffect(() => {
    // успех-хаптика идёт здесь, а не в мутации: тогда она не задваивается и
    // срабатывает даже при выключенных анимациях
    if (number) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [number]);

  const header = <Stack.Screen options={{ ...detailOptions, title: "Заказ принят" }} />;

  if (!number) {
    return (
      <>
        {header}
        <Screen>
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="doc.text.magnifyingglass"
              title="Заказ не найден"
              subtitle="Похоже, вы открыли этот экран напрямую. Загляните в «Мои заказы»."
              actionLabel="В каталог"
              onAction={() => router.replace("/catalog" as Href)}
            />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      {header}
      <Screen scroll>
        <Celebration />

        <AppText variant="callout" color="muted" align="center">
          Заявка принята
        </AppText>
        {/* номер — единственное, что человек будет диктовать менеджеру: он крупнее всего */}
        <AppText
          variant="largeTitle"
          weight="800"
          align="center"
          accessibilityLabel={`Заявка номер ${number}`}
          style={styles.number}
        >
          №{number}
        </AppText>
        <AppText variant="callout" color="muted" align="center" style={styles.subtitle}>
          Менеджер позвонит в ближайшее время, чтобы подтвердить состав и доставку. Оплата при
          получении.
        </AppText>

        <View
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <View style={styles.cardRow}>
            <AppText variant="subhead" color="muted">
              Статус
            </AppText>
            <Badge label={status ?? "Новая"} tone="brand" />
          </View>

          {Number.isFinite(total) ? (
            <>
              <Divider style={styles.divider} />
              <View style={styles.cardRow}>
                <AppText variant="subhead" color="muted">
                  Сумма заказа
                </AppText>
                <AppText variant="headline" weight="800">
                  {formatKopecks(total)}
                </AppText>
              </View>
            </>
          ) : null}
        </View>

        <AppText variant="title3" style={styles.sectionTitle}>
          Что дальше
        </AppText>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          {STEPS.map((step, index) => (
            <View key={step.title}>
              {index > 0 ? <Divider style={styles.divider} /> : null}
              <View style={styles.step}>
                <View style={[styles.stepIcon, { backgroundColor: colors.brandSoft }]}>
                  <SymbolView name={step.icon} size={16} tintColor={colors.brand} />
                </View>
                <View style={styles.stepBody}>
                  <AppText variant="subhead" weight="600">
                    {step.title}
                  </AppText>
                  <AppText variant="footnote" color="muted">
                    {step.text}
                  </AppText>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          {isAuthenticated ? (
            <Button
              title="Мои заказы"
              size="lg"
              fullWidth
              leftIcon="list.bullet.rectangle"
              onPress={() => router.navigate("/account/orders" as Href)}
            />
          ) : null}
          <Button
            title="В каталог"
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => router.navigate("/catalog" as Href)}
          />
        </View>

        <BadDisclaimer variant="compact" style={styles.disclaimer} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, justifyContent: "center" },
  number: { marginTop: spacing.xs },
  subtitle: { marginTop: spacing.md, marginBottom: spacing.xl, paddingHorizontal: spacing.sm },
  card: {
    padding: spacing.base,
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  divider: { marginVertical: spacing.md },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  step: { flexDirection: "row", gap: spacing.md },
  stepIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBody: { flex: 1, gap: 2 },
  actions: { gap: spacing.md, marginTop: spacing.xl },
  disclaimer: { marginTop: spacing.lg, textAlign: "center" },
});
