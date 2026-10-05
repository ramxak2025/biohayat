import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import * as Application from "expo-application";
import * as Haptics from "expo-haptics";
import { Stack, useRouter, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import {
  AccountHero,
  BonusCard,
  ContactsCard,
  LEGAL_URL,
  MenuGroup,
  MenuRow,
  ordersCountLabel,
  useOpenBrowser,
  useOrders,
} from "@/components/account";
import { AppText, BadDisclaimer, ErrorState, Screen } from "@/components/ui";
import { useFavorites } from "@/hooks/use-favorites";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/store/auth";
import { sessionGeneration } from "@/lib/session-generation";
import { spacing } from "@/theme";

/** Относительный переход внутри стека вкладки «Кабинет». */
type RelativeHref = `./${string}`;

export function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const openBrowser = useOpenBrowser();

  const token = useAuth((state) => state.token);
  const customer = useAuth((state) => state.customer);
  const logout = useAuth((state) => state.logout);
  const refreshProfile = useAuth((state) => state.refreshProfile);

  const settingsQuery = useSettings();
  const favorites = useFavorites();
  const orders = useOrders();

  const [isRefreshing, setRefreshing] = useState(false);
  const isAuthenticated = !!token;

  const goSignIn = useCallback(() => router.push("/auth" as Href), [router]);

  const goRelative = useCallback(
    (path: RelativeHref) => router.push(path, { relativeToDirectory: true }),
    [router],
  );

  /** Разделы кабинета без сессии бессмысленны — уводим на вход. */
  const goProtected = useCallback(
    (path: RelativeHref) => (isAuthenticated ? goRelative(path) : goSignIn()),
    [isAuthenticated, goRelative, goSignIn],
  );

  const goTracker = useCallback(() => {
    if (!isAuthenticated) {
      goSignIn();
      return;
    }
    router.navigate("/tracker" as Href);
  }, [isAuthenticated, goSignIn, router]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      settingsQuery.refetch(),
      isAuthenticated ? orders.refetch() : Promise.resolve(),
      isAuthenticated ? refreshProfile() : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: qk.favorites }),
    ]);
    setRefreshing(false);
  }, [settingsQuery, orders, isAuthenticated, refreshProfile, queryClient]);

  const performLogout = useCallback(async () => {
    const epoch = sessionGeneration();
    try {
      // снимаем пуш-токены устройства; сам JWT сервер не отзывает
      await api.auth.logout();
    } catch {
      // выход не должен зависеть от сети — токен всё равно стираем локально
    }
    if (epoch !== sessionGeneration()) return;
    await logout();
    if (sessionGeneration() === epoch + 1) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [logout]);

  const confirmLogout = useCallback(() => {
    Alert.alert(
      "Выйти из аккаунта?",
      "Заказы, избранное и курсы приёма сохранятся — вы сможете войти снова по номеру телефона.",
      [
        { text: "Отмена", style: "cancel" },
        { text: "Выйти", style: "destructive", onPress: () => void performLogout() },
      ],
      { cancelable: true },
    );
  }, [performLogout]);

  /** Подсказка гостю: раздел откроется после входа. */
  const authHint = isAuthenticated ? undefined : "Нужен вход";
  const favoritesCount = favorites.ids.size;
  const ordersCount = orders.data?.items.length ?? 0;
  const version = Application.nativeApplicationVersion ?? "1.0.0";
  const build = Application.nativeBuildVersion;
  const legal = settingsQuery.data?.legal;

  const copyright = [
    `© ${new Date().getFullYear()} ${legal?.name ?? "ХАЯТ"}`,
    legal?.inn ? `ИНН ${legal.inn}` : null,
    legal?.ogrn ? `ОГРН ${legal.ogrn}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Stack.Screen options={{ title: "Кабинет" }} />

      <Screen
        scroll
        onRefresh={() => void refresh()}
        refreshing={isRefreshing}
        contentContainerStyle={styles.content}
      >
        <AccountHero
          customer={isAuthenticated ? customer : null}
          onSignIn={goSignIn}
          onOpenProfile={() => goRelative("./profile")}
        />

        {isAuthenticated && customer ? <BonusCard balance={customer.bonusBalance} /> : null}

        <MenuGroup title="Покупки">
          <MenuRow
            icon="shippingbox.fill"
            title="Мои заказы"
            subtitle={authHint}
            value={
              isAuthenticated && ordersCount > 0
                ? ordersCountLabel(ordersCount, !!orders.hasNextPage)
                : undefined
            }
            onPress={() => goProtected("./orders")}
          />
          <MenuRow
            icon="heart.fill"
            title="Избранное"
            value={favoritesCount > 0 ? String(favoritesCount) : undefined}
            onPress={() => goRelative("./favorites")}
          />
        </MenuGroup>

        <MenuGroup title="Здоровье">
          <MenuRow
            icon="pills.fill"
            title="Курсы приёма"
            subtitle={authHint}
            onPress={goTracker}
          />
          <MenuRow
            icon="testtube.2"
            tone="accent"
            title="Совместимость БАД"
            subtitle="Проверьте, что можно принимать вместе"
            onPress={() => goRelative("./compatibility")}
          />
          <MenuRow
            icon="stethoscope"
            tone="accent"
            title="Консультация нутрициолога"
            subtitle={authHint}
            onPress={() => goProtected("./consultation")}
          />
        </MenuGroup>

        <MenuGroup title="Аккаунт">
          <MenuRow
            icon="person.text.rectangle"
            title="Профиль"
            subtitle={authHint}
            onPress={() => goProtected("./profile")}
          />
        </MenuGroup>

        {settingsQuery.isError && !settingsQuery.data ? (
          <ErrorState
            compact
            error={settingsQuery.error}
            title="Не удалось загрузить контакты"
            onRetry={() => void settingsQuery.refetch()}
          />
        ) : (
          <ContactsCard settings={settingsQuery.data} />
        )}

        <MenuGroup title="Документы" footer={copyright}>
          <MenuRow
            icon="doc.plaintext"
            tone="neutral"
            title="Публичная оферта"
            onPress={() => void openBrowser(LEGAL_URL.offer)}
          />
          <MenuRow
            icon="hand.raised.fill"
            tone="neutral"
            title="Политика конфиденциальности"
            onPress={() => void openBrowser(LEGAL_URL.privacy)}
          />
          <MenuRow
            icon="box.truck"
            tone="neutral"
            title="Доставка и оплата"
            onPress={() => void openBrowser(LEGAL_URL.delivery)}
          />
        </MenuGroup>

        {isAuthenticated ? (
          <MenuGroup>
            <MenuRow
              icon="rectangle.portrait.and.arrow.right"
              tone="danger"
              title="Выйти"
              destructive
              chevron={false}
              onPress={confirmLogout}
            />
          </MenuGroup>
        ) : null}

        <BadDisclaimer variant="compact" />

        <View style={styles.version}>
          <AppText variant="caption" color="faint" align="center">
            {`ХАЯТ ${version}${build ? ` (${build})` : ""}`}
          </AppText>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.sm },
  version: { paddingTop: spacing.xs },
});
