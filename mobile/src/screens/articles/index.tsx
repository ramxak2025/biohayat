import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { MaterialListItem } from "@/api/types";
import { AppText, EmptyState, ErrorState, useDetailScreenOptions } from "@/components/ui";
import { spacing, useColors } from "@/theme";
import { useHeaderInset } from "@/components/ui/screen";

import { ArticleCard, ArticleCardSkeleton } from "./article-card";

/** Боковое поле экрана по HIG. */
const SIDE = spacing.base;

export function ArticlesScreen() {
  const colors = useColors();
  const router = useRouter();
  const detailOptions = useDetailScreenOptions();
  const headerInset = useHeaderInset();

  const query = useQuery({
    queryKey: qk.materials,
    queryFn: ({ signal }) => api.catalog.materials(signal),
    staleTime: 30 * 60 * 1000,
  });

  const items = query.data ?? [];

  const openArticle = (item: MaterialListItem) =>
    router.push({ pathname: "/(tabs)/(home)/article/[slug]", params: { slug: item.slug } });

  const header = <Stack.Screen options={{ ...detailOptions, title: "Статьи" }} />;

  const lead = (
    <AppText variant="subhead" color="muted" style={styles.lead}>
      Разбираемся, как работают витамины, травы и растительные масла — коротко и по делу.
    </AppText>
  );

  if (query.isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {header}
        <View style={[styles.states, { paddingTop: headerInset + spacing.base }]}>
          {lead}
          <ArticleCardSkeleton variant="feature" />
          {[0, 1, 2].map((key) => (
            <ArticleCardSkeleton key={key} />
          ))}
        </View>
      </View>
    );
  }

  if (query.isError && items.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {header}
        <View style={[styles.states, { paddingTop: headerInset + spacing.base }]}>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {header}

      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        // обязательно: иначе iOS не подставит инсеты шапки и таб-бара
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        ListHeaderComponent={items.length > 0 ? lead : null}
        renderItem={({ item, index }) => (
          <ArticleCard
            item={item}
            // первый материал — самый свежий: показываем его крупно, как на сайте
            variant={index === 0 ? "feature" : "row"}
            index={index}
            onPress={openArticle}
            style={styles.card}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="newspaper"
            title="Статей пока нет"
            subtitle="Мы готовим материалы о витаминах, травах и здоровых привычках. Загляните чуть позже."
            actionLabel="Обновить"
            onAction={() => void query.refetch()}
          />
        }
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        showsVerticalScrollIndicator
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  states: { flex: 1, paddingHorizontal: SIDE, paddingTop: spacing.base, gap: spacing.md },
  content: { paddingHorizontal: SIDE, paddingBottom: spacing["2xl"] },
  card: { marginBottom: spacing.md },
  lead: { marginBottom: spacing.base, marginTop: spacing.xs },
});
