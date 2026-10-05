import { sessionGeneration } from "@/lib/session-generation";
import { useCallback } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { Stack, useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { Order } from "@/api/types";
import {
  canCancelOrder,
  OrderItems,
  OrderProgress,
  ORDER_STATUS_TONE,
  orderStatusLabel,
  openExternalUrl,
  telHref,
  useOpenBrowser,
} from "@/components/account";
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  errorMessage,
  PressableScale,
  Screen,
  Skeleton,
  useDetailScreenOptions,
} from "@/components/ui";
import { useSettings } from "@/hooks/use-settings";
import { formatDate, formatPhone } from "@/lib/format";
import { useIsAuthenticated } from "@/store/auth";
import { MIN_TAP_SIZE, spacing, useColors } from "@/theme";

export interface OrderScreenProps {
  number: string;
}

/** Время оформления — уточняет «сегодня/вчера» в шапке. */
function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

const CARRIER_LABEL: Record<string, string> = {
  cdek: "СДЭК",
  pochta: "Почта России",
};

export function OrderScreen({ number }: OrderScreenProps) {
  const router = useRouter();
  const colors = useColors();
  const queryClient = useQueryClient();
  const epoch = sessionGeneration();
  const detailOptions = useDetailScreenOptions();
  const openBrowser = useOpenBrowser();

  const isAuthenticated = useIsAuthenticated();
  const { data: settings } = useSettings();

  const query = useQuery({
    queryKey: qk.order(number),
    queryFn: ({ signal }) => api.orders.byNumber(number, signal),
    enabled: isAuthenticated && !!number,
  });

  const order = query.data;

  const cancel = useMutation({
    mutationFn: () => api.orders.cancel(number),
    onSuccess: (updated: Order) => {
      if (epoch !== sessionGeneration()) return;
      queryClient.setQueryData(qk.order(number), updated);
      void queryClient.invalidateQueries({ queryKey: qk.orders });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: unknown) => {
      // отмена могла не доехать до сервера — предлагаем живой канал, а не тупик
      Alert.alert("Не удалось отменить заказ", `${errorMessage(error)}\n\nПозвоните нам — менеджер отменит заказ вручную.`, [
        { text: "Закрыть", style: "cancel" },
        settings
          ? {
              text: "Позвонить",
              onPress: () => void openExternalUrl(telHref(settings.phone)),
            }
          : { text: "Хорошо" },
      ]);
    },
  });

  const callManager = useCallback(() => {
    if (!settings) return;
    void openExternalUrl(telHref(settings.phone), "Звонки недоступны на этом устройстве.");
  }, [settings]);

  const confirmCancel = useCallback(() => {
    Alert.alert(
      "Отменить заказ?",
      "Мы сообщим менеджеру. Отменённый заказ вернуть нельзя — его придётся оформить заново.",
      [
        { text: "Не отменять", style: "cancel" },
        { text: "Отменить заказ", style: "destructive", onPress: () => cancel.mutate() },
      ],
      { cancelable: true },
    );
  }, [cancel]);

  const header = <Stack.Screen options={{ ...detailOptions, title: `Заказ №${number}` }} />;

  if (!isAuthenticated) {
    return (
      <>
        {header}
        <Screen>
          <EmptyState
            icon="shippingbox"
            title="Войдите, чтобы открыть заказ"
            subtitle="Заказы видны только владельцу аккаунта."
            actionLabel="Войти"
            onAction={() => router.push("/auth" as Href)}
          />
        </Screen>
      </>
    );
  }

  if (query.isLoading) {
    return (
      <>
        {header}
        <Screen scroll contentContainerStyle={styles.content}>
          <Card>
            <Skeleton width={140} height={20} />
            <Skeleton width={100} height={13} style={styles.gapTop} />
            <Skeleton width="100%" height={56} radius={16} style={styles.gapTop} />
          </Card>
          <Card>
            <Skeleton width="80%" height={16} />
            <Skeleton width="60%" height={16} style={styles.gapTop} />
            <Skeleton width="40%" height={22} style={styles.gapTop} />
          </Card>
        </Screen>
      </>
    );
  }

  if (query.isError || !order) {
    const notFound =
      query.error instanceof ApiError &&
      (query.error.status === 404 || query.error.status === 403);

    return (
      <>
        {header}
        <Screen scroll onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
          <ErrorState
            error={query.error}
            title={notFound ? "Заказ не найден" : undefined}
            onRetry={notFound ? undefined : () => void query.refetch()}
          />
        </Screen>
      </>
    );
  }

  const tracking = order.tracking;
  const carrier = tracking?.carrier ? (CARRIER_LABEL[tracking.carrier] ?? tracking.carrier) : null;
  const time = formatTime(order.createdAt);

  return (
    <>
      {header}
      <Screen
        scroll
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching}
        contentContainerStyle={styles.content}
      >
        <Card>
          <View style={styles.headRow}>
            <View style={styles.headTitles}>
              <AppText variant="title3">{`Заказ №${order.number}`}</AppText>
              <AppText variant="footnote" color="muted">
                {`от ${formatDate(order.createdAt)}${time ? `, ${time}` : ""}`}
              </AppText>
            </View>
            <Badge label={orderStatusLabel(order)} tone={ORDER_STATUS_TONE[order.status]} />
          </View>

          <View style={styles.progress}>
            <OrderProgress status={order.status} />
          </View>
        </Card>

        {tracking ? (
          <Card tone="brand">
            <View style={styles.trackRow}>
              <SymbolView name="box.truck" size={20} tintColor={colors.brand} />
              <View style={styles.trackTitles}>
                <AppText variant="headline">Отслеживание</AppText>
                <AppText variant="subhead" color="muted">
                  {carrier ? `${carrier} · ${tracking.number}` : tracking.number}
                </AppText>
              </View>
            </View>
            <Button
              title="Отследить посылку"
              variant="secondary"
              size="md"
              rightIcon="arrow.up.right.square"
              fullWidth
              onPress={() => void openBrowser(tracking.url)}
              style={styles.trackAction}
            />
          </Card>
        ) : null}

        <Card>
          <AppText variant="headline" style={styles.cardTitle}>
            Состав заказа
          </AppText>
          <OrderItems items={order.items} total={order.total} withDeliveryNote />
        </Card>

        <Card>
          <AppText variant="headline" style={styles.cardTitle}>
            Доставка
          </AppText>
          <AppText variant="callout" color={order.address ? "text" : "faint"}>
            {order.address ?? "Адрес не указан — менеджер уточнит по телефону."}
          </AppText>
          <AppText variant="footnote" color="muted" style={styles.gapTop}>
            {`${order.customerName} · ${formatPhone(order.phone)}`}
          </AppText>
        </Card>

        {order.comment ? (
          <Card tone="soft">
            <AppText variant="headline" style={styles.cardTitle}>
              Комментарий
            </AppText>
            <AppText variant="callout" color="muted">
              {order.comment}
            </AppText>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <Button
            title="Связаться с менеджером"
            variant="secondary"
            size="lg"
            leftIcon="phone.fill"
            fullWidth
            disabled={!settings}
            onPress={callManager}
          />

          {canCancelOrder(order.status) ? (
            <PressableScale
              onPress={confirmCancel}
              disabled={cancel.isPending}
              haptic="medium"
              accessibilityRole="button"
              accessibilityLabel="Отменить заказ"
              accessibilityHint="Потребуется подтверждение"
              accessibilityState={{ disabled: cancel.isPending, busy: cancel.isPending }}
              style={styles.cancelAction}
            >
              {cancel.isPending ? <ActivityIndicator color={colors.danger} /> : null}
              <AppText variant="callout" color="danger" weight="600">
                Отменить заказ
              </AppText>
            </PressableScale>
          ) : null}
        </View>

        <AppText variant="footnote" color="faint" align="center">
          Заказ — это заявка. Оплата при получении, менеджер подтвердит состав и доставку.
        </AppText>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.base, paddingTop: spacing.sm },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  headTitles: { flex: 1, gap: 2 },
  progress: { marginTop: spacing.sm },
  cardTitle: { marginBottom: spacing.sm },
  gapTop: { marginTop: spacing.sm },
  trackRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  trackTitles: { flex: 1, gap: 2 },
  trackAction: { marginTop: spacing.base },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  cancelAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    alignSelf: "center",
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: spacing.lg,
  },
});
