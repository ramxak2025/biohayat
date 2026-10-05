import { useCallback } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Stack, useRouter, type Href } from "expo-router";

import type { Order } from "@/api/types";
import { OrderCard, useOrders } from "@/components/account";
import {
  Card,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  useDetailScreenOptions,
} from "@/components/ui";
import { useIsAuthenticated } from "@/store/auth";
import { spacing } from "@/theme";

/** Заглушка повторяет метрику OrderCard, чтобы список не «прыгал» при загрузке. */
function OrdersSkeleton() {
  return (
    <View style={styles.skeleton}>
      {[0, 1, 2].map((index) => (
        <Card key={index} padded={spacing.base}>
          <View style={styles.skeletonHeader}>
            <Skeleton width={120} height={17} />
            <Skeleton width={84} height={20} radius={999} />
          </View>
          <Skeleton width={90} height={12} style={styles.skeletonLine} />
          <Skeleton width="100%" height={10} radius={999} style={styles.skeletonLine} />
          <Skeleton width="80%" height={12} style={styles.skeletonLine} />
          <Skeleton width="55%" height={12} style={styles.skeletonLine} />
        </Card>
      ))}
    </View>
  );
}

export function OrdersScreen() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const detailOptions = useDetailScreenOptions();
  const orders = useOrders();

  const items = orders.data?.items ?? [];

  const openOrder = useCallback(
    (order: Order) =>
      router.push({ pathname: "/account/order/[number]", params: { number: String(order.number) } }),
    [router],
  );

  const loadMore = useCallback(() => {
    if (orders.hasNextPage && !orders.isFetchingNextPage) void orders.fetchNextPage();
  }, [orders]);

  const header = <Stack.Screen options={{ ...detailOptions, title: "Мои заказы" }} />;

  if (!isAuthenticated) {
    return (
      <>
        {header}
        <Screen>
          <EmptyState
            icon="shippingbox"
            title="Войдите, чтобы увидеть заказы"
            subtitle="История заказов хранится в вашем аккаунте и доступна на всех устройствах."
            actionLabel="Войти"
            onAction={() => router.push("/auth" as Href)}
          />
        </Screen>
      </>
    );
  }

  if (orders.isLoading && !items.length) {
    return (
      <>
        {header}
        <Screen scroll>
          <OrdersSkeleton />
        </Screen>
      </>
    );
  }

  if (orders.isError && !items.length) {
    return (
      <>
        {header}
        <Screen scroll onRefresh={() => void orders.refetch()} refreshing={orders.isRefetching}>
          <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
        </Screen>
      </>
    );
  }

  return (
    <>
      {header}
      <FlashList
        data={items}
        keyExtractor={(order) => order.id}
        // без "automatic" не работают инсеты нативных баров на pushed-экране
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        renderItem={({ item, index }) => (
          <OrderCard order={item} index={index} onPress={openOrder} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="shippingbox"
            title="Заказов пока нет"
            subtitle="Соберите корзину — менеджер подтвердит заказ по телефону."
            actionLabel="В каталог"
            onAction={() => router.navigate("/catalog" as Href)}
          />
        }
        ListFooterComponent={
          orders.isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshing={orders.isRefetching}
        onRefresh={() => void orders.refetch()}
        showsVerticalScrollIndicator
      />
    </>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.base, paddingBottom: spacing["2xl"] },
  separator: { height: spacing.md },
  footer: { paddingVertical: spacing.xl },
  skeleton: { gap: spacing.md },
  skeletonHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skeletonLine: { marginTop: spacing.sm },
});
