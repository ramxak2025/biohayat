import { useCallback, useRef } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Stack, useFocusEffect, useRouter, type Href } from "expo-router";

import {
  CartLineRow,
  CartSummary,
  CheckoutBar,
  cartTotals,
  FreeDeliveryProgress,
  UndoToast,
  useCartHydrated,
  useCartUndo,
} from "@/components/cart";
import {
  AppText,
  BadDisclaimer,
  EmptyState,
  ListSkeleton,
  PressableScale,
  Screen,
} from "@/components/ui";
import { useSettings } from "@/hooks/use-settings";
import { plural } from "@/lib/format";
import { useIsAuthenticated } from "@/store/auth";
import { useCart } from "@/store/cart";
import { HIT_SLOP, spacing, useColors } from "@/theme";

/** Запасной порог, если /settings ещё не ответил: 20 000 ₽ — дефолт сервера. */
const FALLBACK_THRESHOLD = 2_000_000;

export function CartScreen() {
  const router = useRouter();
  const colors = useColors();

  const lines = useCart((state) => state.lines);
  const clear = useCart((state) => state.clear);
  const hydrated = useCartHydrated();
  const isAuthenticated = useIsAuthenticated();
  const { data: settings } = useSettings();
  const { removed, removeLine, undo, dismiss } = useCartUndo();

  /** Куда вернуться после экрана входа: «Оформить» нажали, но сессии не было. */
  const pendingCheckout = useRef(false);

  const totals = cartTotals(lines);
  const threshold = settings?.freeDeliveryThreshold?.kopecks ?? FALLBACK_THRESHOLD;

  const openCheckout = useCallback(() => {
    router.push("./checkout" as `./${string}`, { relativeToDirectory: true });
  }, [router]);

  // после возврата с экрана входа продолжаем ровно тот сценарий, который прервали
  useFocusEffect(
    useCallback(() => {
      if (!pendingCheckout.current) return;
      pendingCheckout.current = false;
      if (isAuthenticated) openCheckout();
    }, [isAuthenticated, openCheckout]),
  );

  const goCheckout = () => {
    if (!lines.length) return;
    if (!isAuthenticated) {
      // без Bearer заказ не привяжется к ЛК и навсегда пропадёт из «Моих заказов»
      pendingCheckout.current = true;
      router.push("/auth" as Href);
      return;
    }
    dismiss();
    openCheckout();
  };

  const confirmClear = () => {
    Alert.alert(
      "Очистить корзину?",
      "Все товары будут удалены. Это действие нельзя отменить.",
      [
        { text: "Отмена", style: "cancel" },
        { text: "Очистить", style: "destructive", onPress: () => { dismiss(); clear(); } },
      ],
      { cancelable: true },
    );
  };

  const screenOptions = (
    <Stack.Screen
      options={{
        title: "Корзина",
        headerRight: () =>
          lines.length ? (
            <PressableScale
              onPress={confirmClear}
              haptic="none"
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Очистить корзину"
            >
              {/* мелкий текст берёт brandText: основной зелёный на белом не добирает 4.5:1 */}
              <AppText variant="subhead" weight="600" style={{ color: colors.brandText }}>
                Очистить
              </AppText>
            </PressableScale>
          ) : null,
      }}
    />
  );

  if (!hydrated) {
    return (
      <>
        {screenOptions}
        <Screen scroll>
          <ListSkeleton variant="row" count={3} />
        </Screen>
      </>
    );
  }

  if (!lines.length) {
    return (
      <>
        {screenOptions}
        <Screen>
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="basket"
              title="Корзина пуста"
              subtitle="Добавьте товары из каталога — и оформим заявку за минуту."
              actionLabel="В каталог"
              onAction={() => router.push("/catalog" as Href)}
            />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      {screenOptions}
      <Screen
        scroll
        footer={
          <View pointerEvents="box-none">
            {removed ? (
              <UndoToast
                key={removed.seq}
                title={`Удалено: ${removed.line.name}`}
                onAction={undo}
              />
            ) : null}

            {/* кнопка оформления всегда на виду — её не приходится искать внизу списка */}
            <CheckoutBar
              caption={`${totals.count} ${plural(totals.count, "товар", "товара", "товаров")}`}
              totalKopecks={totals.totalKopecks}
              actionTitle="Оформить заказ"
              onAction={goCheckout}
              actionHint={
                isAuthenticated ? "Перейти к оформлению заказа" : "Сначала нужно войти"
              }
            />
          </View>
        }
      >
        {/* collapsable={false} — иначе exiting-анимация строки не успевает проиграться */}
        <View collapsable={false}>
          {lines.map((line, index) => (
            <CartLineRow key={line.id} line={line} index={index} onRemove={removeLine} />
          ))}
        </View>

        <FreeDeliveryProgress
          totalKopecks={totals.totalKopecks}
          thresholdKopecks={threshold}
          style={styles.block}
        />

        <CartSummary totals={totals} style={styles.block} />

        <BadDisclaimer style={styles.block} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, justifyContent: "center" },
  block: { marginTop: spacing.base },
});
