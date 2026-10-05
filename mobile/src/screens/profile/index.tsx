import { StyleSheet, Switch, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Stack, useRouter, type Href } from "expo-router";

import { MenuGroup, MenuRow } from "@/components/account";
import {
  AppText,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  useDetailScreenOptions,
} from "@/components/ui";
import { useAuth, useIsAuthenticated } from "@/store/auth";
import { spacing, useColors } from "@/theme";

import { DangerZone } from "./danger-zone";
import { PasswordSection } from "./password-section";
import { ProfileForm } from "./profile-form";
import { useIntakeReminders } from "./use-reminders";

export function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const detailOptions = useDetailScreenOptions();

  const isAuthenticated = useIsAuthenticated();
  const customer = useAuth((state) => state.customer);
  const reminders = useIntakeReminders();

  const header = <Stack.Screen options={{ ...detailOptions, title: "Профиль" }} />;

  if (!isAuthenticated) {
    return (
      <>
        {header}
        <Screen>
          <EmptyState
            icon="person.crop.circle"
            title="Войдите в аккаунт"
            subtitle="Профиль, заказы и курсы приёма доступны после входа по номеру телефона."
            actionLabel="Войти"
            onAction={() => router.push("/auth" as Href)}
          />
        </Screen>
      </>
    );
  }

  if (!customer) {
    return (
      <>
        {header}
        <Screen scroll contentContainerStyle={styles.content}>
          <Card>
            <Skeleton width="40%" height={13} />
            <Skeleton width="100%" height={50} radius={16} style={styles.gap} />
            <Skeleton width="40%" height={13} style={styles.gap} />
            <Skeleton width="100%" height={50} radius={16} style={styles.gap} />
          </Card>
        </Screen>
      </>
    );
  }

  return (
    <>
      {header}
      <Screen scroll contentContainerStyle={styles.content}>
        {/* key={id} — при смене аккаунта форма пересоздаётся с новыми значениями */}
        <ProfileForm key={customer.id} customer={customer} />

        <PasswordSection />

        <MenuGroup
          title="Напоминания"
          footer="Напоминания приходят на это устройство в часы приёма из ваших курсов. На других устройствах настройка своя."
        >
          <MenuRow
            icon="bell.badge.fill"
            tone="accent"
            title="Напоминать о приёме"
            chevron={false}
            right={
              <Switch
                value={reminders.enabled}
                disabled={!reminders.ready}
                onValueChange={(next) => {
                  void Haptics.selectionAsync();
                  reminders.setEnabled(next);
                }}
                trackColor={{ true: colors.brand, false: colors.surfaceSunken }}
                ios_backgroundColor={colors.surfaceSunken}
                accessibilityLabel="Напоминания о приёме БАД"
              />
            }
          />
        </MenuGroup>

        <DangerZone />

        <View style={styles.footer}>
          <AppText variant="footnote" color="faint" align="center">
            Данные профиля используются только для оформления заказов и связи с вами.
          </AppText>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.base, paddingTop: spacing.sm },
  gap: { marginTop: spacing.md },
  footer: { paddingTop: spacing.xs },
});
