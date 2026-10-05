import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Stack, useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import type { Consultation } from "@/api/types";
import {
  AppText,
  BadDisclaimer,
  Button,
  Card,
  SectionHeader,
  Screen,
  useDetailScreenOptions,
} from "@/components/ui";
import { useSettings } from "@/hooks/use-settings";
import { formatPhone, normalizePhone } from "@/lib/format";
import { useIsAuthenticated } from "@/store/auth";
import { Duration, Ease, radii, spacing, useColors } from "@/theme";

import { ConsultationForm } from "./consultation-form";
import { RequestList } from "./request-list";

const INTRO =
  "Опишите ваш вопрос — нутрициолог подберёт БАД, проверит совместимость и составит рекомендации. Мы свяжемся с вами по указанному телефону.";

export function ConsultationScreen() {
  const colors = useColors();
  const router = useRouter();
  const detailOptions = useDetailScreenOptions();
  const reduced = useReducedMotion();
  const isAuthenticated = useIsAuthenticated();
  const { data: settings } = useSettings();

  const [sent, setSent] = useState<Consultation | null>(null);

  const phone = settings?.phone?.trim() ?? "";
  const callSupport = () => {
    if (phone) void Linking.openURL(`tel:${normalizePhone(phone)}`);
  };

  const header = <Stack.Screen options={{ ...detailOptions, title: "Консультация" }} />;

  const hero = (
    <Card tone="brand" style={styles.hero}>
      <View style={styles.heroRow}>
        <View style={[styles.heroIcon, { backgroundColor: colors.surface }]}>
          <SymbolView name="stethoscope" size={18} tintColor={colors.brand} />
        </View>
        <AppText variant="headline" style={styles.heroTitle}>
          Консультация нутрициолога
        </AppText>
      </View>

      <AppText variant="subhead" color="muted" style={styles.heroText}>
        {INTRO}
      </AppText>
    </Card>
  );

  if (!isAuthenticated) {
    return (
      <>
        {header}
        <Screen scroll>
          {hero}

          <Card tone="soft" elevated={false} style={styles.guestCard}>
            <AppText variant="callout" weight="600">
              Войдите, чтобы отправить заявку
            </AppText>
            <AppText variant="subhead" color="muted" style={styles.guestText}>
              Заявка привяжется к вашему профилю — вы увидите статус и историю обращений.
            </AppText>

            <Button
              title="Войти"
              size="lg"
              fullWidth
              leftIcon="person.crop.circle"
              onPress={() => router.push("/auth" as Href)}
              style={styles.guestAction}
            />

            {phone ? (
              <Button
                title={`Позвонить ${formatPhone(phone)}`}
                variant="outline"
                fullWidth
                leftIcon="phone.fill"
                onPress={callSupport}
                accessibilityLabel={`Позвонить по номеру ${formatPhone(phone)}`}
                style={styles.guestSecondary}
              />
            ) : null}

            {settings?.workingHours ? (
              <View style={styles.hours}>
                <SymbolView name="clock" size={13} tintColor={colors.textFaint} />
                <AppText variant="caption" color="faint">
                  {settings.workingHours}
                </AppText>
              </View>
            ) : null}
          </Card>

          <BadDisclaimer variant="compact" style={styles.bad} />
        </Screen>
      </>
    );
  }

  return (
    <>
      {header}
      <Screen
        scroll
        // клавиатура не должна прятать поле «Ваш вопрос» — инсет добавляет UIKit
        scrollProps={{ automaticallyAdjustKeyboardInsets: true }}
      >
        {hero}

        {sent ? (
          <Animated.View
            entering={
              reduced ? undefined : FadeInDown.duration(Duration.base).easing(Ease.power2Out)
            }
            accessibilityLiveRegion="polite"
          >
            <Card tone="soft" elevated={false} style={styles.success}>
              <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.success} />
              <View style={styles.successText}>
                <AppText variant="callout" weight="600">
                  Спасибо! Заявка принята
                </AppText>
                <AppText variant="footnote" color="muted" style={styles.successHint}>
                  {`Нутрициолог свяжется с вами по телефону ${formatPhone(sent.phone)}. Заявка появилась в списке ниже.`}
                </AppText>
              </View>
            </Card>
          </Animated.View>
        ) : null}

        <View style={styles.formWrap}>
          <ConsultationForm onSent={setSent} />
        </View>

        {phone ? (
          <Button
            title="Позвонить нам"
            variant="ghost"
            fullWidth
            leftIcon="phone.fill"
            onPress={callSupport}
            accessibilityLabel={`Позвонить по номеру ${formatPhone(phone)}`}
            style={styles.call}
          />
        ) : null}

        <SectionHeader title="Мои заявки" style={styles.listHeader} />
        <RequestList />

        <BadDisclaimer variant="compact" style={styles.bad} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.base },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { flex: 1 },
  heroText: { marginTop: spacing.sm },

  guestCard: { marginTop: spacing.base },
  guestText: { marginTop: spacing.xs },
  guestAction: { marginTop: spacing.base },
  guestSecondary: { marginTop: spacing.sm },
  hours: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },

  success: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginTop: spacing.base },
  successText: { flex: 1 },
  successHint: { marginTop: 2 },

  formWrap: { marginTop: spacing.xl },
  call: { marginTop: spacing.md },
  listHeader: { marginTop: spacing["2xl"] },
  bad: { marginTop: spacing.xl },
});
