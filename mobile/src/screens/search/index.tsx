import { useCallback, useEffect, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { Product } from "@/api/types";
import { useColors } from "@/theme";

import { DEBOUNCE_MS, MIN_QUERY_LENGTH, SEARCH_LIMIT, SUGGESTION_LIMIT } from "./constants";
import { SearchField } from "./search-field";
import { SearchLanding } from "./search-landing";
import { SearchResults } from "./search-results";
import { SuggestionList } from "./suggestion-list";
import { useDebouncedValue } from "./use-debounced-value";
import { useSearchHistory } from "./use-search-history";

/**
 * Модальный поиск (маршрут /search, presentation: "modal").
 *
 * Три состояния одного экрана:
 *   пусто             → история запросов + популярные категории;
 *   ввод ≥ 2 символов → живые подсказки с дебаунсом, тап уводит сразу в товар;
 *   запрос отправлен  → плотная сетка выдачи в две колонки, как в каталоге.
 */
export function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const history = useSearchHistory();
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const incomingQuery = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";

  const [text, setText] = useState(incomingQuery);
  /** Запрос, по которому показана полная выдача. Пустая строка — режим подсказок. */
  const [submitted, setSubmitted] = useState(incomingQuery.length >= MIN_QUERY_LENGTH ? incomingQuery : "");

  useEffect(() => {
    setText(incomingQuery);
    setSubmitted(incomingQuery.length >= MIN_QUERY_LENGTH ? incomingQuery : "");
  }, [incomingQuery]);

  const trimmed = text.trim();
  const debounced = useDebouncedValue(trimmed, DEBOUNCE_MS);
  const showResults = submitted.length >= MIN_QUERY_LENGTH;

  const suggestions = useQuery({
    queryKey: qk.suggestions(debounced),
    queryFn: ({ signal }) => api.catalog.suggestions(debounced, SUGGESTION_LIMIT, signal),
    enabled: !showResults && debounced.length >= MIN_QUERY_LENGTH,
    staleTime: 5 * 60 * 1000,
    // прошлые подсказки остаются на экране, пока грузятся новые — список не мигает
    placeholderData: keepPreviousData,
  });

  const results = useQuery({
    queryKey: qk.search(submitted),
    queryFn: ({ signal }) => api.catalog.search(submitted, SEARCH_LIMIT, signal),
    enabled: showResults,
    staleTime: 5 * 60 * 1000,
  });

  const close = useCallback(() => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  /**
   * Экран поиска — модалка корневого стека, а карточки товаров живут во вкладках.
   * Поэтому сначала закрываем модалку и только потом уходим вглубь «Каталога»,
   * иначе экран товара откроется поверх модалки и из него некуда возвращаться.
   */
  const openProduct = useCallback(
    (slug: string) => {
      Keyboard.dismiss();
      if (trimmed.length >= MIN_QUERY_LENGTH) history.remember(trimmed);
      if (router.canGoBack()) router.back();
      // navigate, а не push: вкладки уже лежат в стеке ниже — push создал бы их копию
      router.navigate({ pathname: "/catalog/product/[slug]", params: { slug } });
    },
    [history, router, trimmed],
  );

  const openCatalog = useCallback(
    (category?: string) => {
      Keyboard.dismiss();
      if (router.canGoBack()) router.back();
      router.navigate({ pathname: "/catalog", params: category ? { category } : {} });
    },
    [router],
  );

  const runSearch = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (value.length < MIN_QUERY_LENGTH) return;
      Haptics.selectionAsync().catch(() => undefined);
      Keyboard.dismiss();
      setText(value);
      setSubmitted(value);
      history.remember(value);
    },
    [history],
  );

  const changeText = useCallback((value: string) => {
    setText(value);
    // любая правка возвращает к подсказкам: выдача под старый запрос уже неактуальна
    setSubmitted("");
  }, []);

  /**
   * Возврат в поле = желание править запрос. Показываем подсказки снова, и заодно
   * это гарантирует, что клавиатура никогда не висит над сеткой результатов.
   */
  const focusField = useCallback(() => setSubmitted(""), []);

  const bottomInset = insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <SearchField
        value={text}
        onChangeText={changeText}
        onSubmit={() => runSearch(text)}
        onFocus={focusField}
        onCancel={close}
      />

      {showResults ? (
        <SearchResults
          query={submitted}
          result={results.data}
          isLoading={results.isLoading}
          error={results.error}
          onRetry={results.refetch}
          onPressProduct={(product: Product) => openProduct(product.slug)}
          onOpenCatalog={() => openCatalog()}
          bottomInset={bottomInset}
        />
      ) : trimmed.length >= MIN_QUERY_LENGTH ? (
        <SuggestionList
          query={trimmed}
          matched={debounced}
          items={suggestions.data ?? []}
          isLoading={suggestions.isLoading || suggestions.isFetching || debounced !== trimmed}
          error={suggestions.error}
          onRetry={suggestions.refetch}
          onPressSuggestion={(item) => openProduct(item.slug)}
          onShowAll={() => runSearch(trimmed)}
          bottomInset={bottomInset}
        />
      ) : (
        <SearchLanding
          history={history.ready ? history.items : []}
          onPickQuery={runSearch}
          onForget={history.forget}
          onClearHistory={history.clear}
          onOpenCategory={(slug) => openCatalog(slug)}
          bottomInset={bottomInset}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
