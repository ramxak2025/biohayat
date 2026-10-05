import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import { ProductGrid } from "@/components/product-card";
import { AppText, Button, Card, EmptyState, Screen, useDetailScreenOptions } from "@/components/ui";
import { useFavorites } from "@/hooks/use-favorites";
import { useIsAuthenticated } from "@/store/auth";
import { spacing } from "@/theme";

export function FavoritesScreen() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const detailOptions = useDetailScreenOptions();
  const favorites = useFavorites();

  const serverQuery = useQuery({
    queryKey: qk.favorites,
    queryFn: ({ signal }) => api.favorites.list(signal),
    enabled: isAuthenticated,
  });

  // ID переживают очистку временного кэша: карточки восстанавливаем из общей базы.
  const guestIds = useMemo(
    () => (isAuthenticated ? [] : Array.from(favorites.ids)),
    [isAuthenticated, favorites.ids],
  );
  const guestQuery = useQuery({
    queryKey: qk.productsByIds(guestIds),
    queryFn: ({ signal }) => api.catalog.productsByIds(guestIds, signal),
    enabled: !isAuthenticated && guestIds.length > 0,
  });

  const goCatalog = () => router.navigate("/catalog" as Href);
  const goSignIn = () => router.push("/auth" as Href);

  const header = <Stack.Screen options={{ ...detailOptions, title: "Избранное" }} />;

  if (!isAuthenticated) {
    if (!guestIds.length) {
      return (
        <>
          {header}
          <Screen>
            <EmptyState
              icon="heart"
              title="В избранном пока пусто"
              subtitle="Нажимайте на сердечко на карточке товара, чтобы сохранить его сюда."
              actionLabel="В каталог"
              onAction={goCatalog}
            />
          </Screen>
        </>
      );
    }

    return (
      <>
        {header}
        <ProductGrid
          products={guestQuery.data ?? []}
          isLoading={guestQuery.isLoading}
          error={guestQuery.error}
          onRetry={() => void guestQuery.refetch()}
          refreshing={guestQuery.isRefetching}
          onRefresh={() => void guestQuery.refetch()}
          emptyIcon="heart"
          emptyTitle="Сохранённые товары сейчас недоступны"
          emptySubtitle="Возможно, их сняли с продажи. Список избранного сохранён на устройстве."
          emptyActionLabel="В каталог"
          onEmptyAction={goCatalog}
          ListHeaderComponent={
            <View style={styles.headerWrap}>
              <Card tone="brand">
                <AppText variant="headline">Избранное хранится на устройстве</AppText>
                <AppText variant="subhead" color="muted" style={styles.headerNote}>
                  Войдите, чтобы сохранить его в аккаунте: список будет доступен на всех
                  устройствах и не потеряется при переустановке.
                </AppText>
                <Button
                  title="Войти"
                  variant="secondary"
                  size="sm"
                  onPress={goSignIn}
                  style={styles.headerAction}
                />
              </Card>
            </View>
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      <ProductGrid
        products={serverQuery.data ?? []}
        isLoading={serverQuery.isLoading}
        error={serverQuery.error}
        onRetry={() => void serverQuery.refetch()}
        refreshing={serverQuery.isRefetching}
        onRefresh={() => void serverQuery.refetch()}
        emptyIcon="heart"
        emptyTitle="В избранном пока пусто"
        emptySubtitle="Нажимайте на сердечко на карточке товара, чтобы сохранить его сюда."
        emptyActionLabel="В каталог"
        onEmptyAction={goCatalog}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // выравниваем шапку по боковому полю сетки (её контейнер уже сдвинут на полжёлоба)
  headerWrap: { paddingHorizontal: spacing.xs + 2, paddingBottom: spacing.md },
  headerNote: { marginTop: spacing.xs },
  headerAction: { marginTop: spacing.md },
});
