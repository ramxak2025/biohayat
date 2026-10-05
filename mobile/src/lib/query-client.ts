import { AppState } from "react-native";
import { API_BASE } from "@/api/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, focusManager, defaultShouldDehydrateQuery, type Query } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { ApiError } from "@/api/client";

/**
 * Кэш подобран под магазин: каталог меняется редко, корзину/ЛК держим свежее.
 * Персистим на диск — при старте без сети пользователь видит прошлый каталог.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => {
        // 4xx не ретраим: ответ не изменится. Сеть/5xx — до двух раз.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: "always",
    },
    mutations: { retry: 0 },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: `hayat.public-cache.v2:${API_BASE}`,
  throttleTime: 2000,
});

/**
 * Связь NetInfo → onlineManager нужна, чтобы запросы перезапрашивались после
 * возврата сети. Но «офлайн» объявляем ТОЛЬКО когда система прямо говорит
 * isConnected === false.
 *
 * Почему так: isInternetReachable часто приходит null (проверка ещё не
 * завершилась) или false там, где сеть на самом деле есть — в симуляторе это
 * воспроизводится всегда. При строгой проверке TanStack Query ставит ВСЕ запросы
 * в очередь и экран молча остаётся пустым: ни данных, ни ошибки. Ложный «онлайн»
 * стоит одного неудачного запроса с понятной ошибкой, ложный «офлайн» — пустого
 * приложения.
 */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false);
  }),
);

const PUBLIC_KEYS = new Set(["settings", "taxonomy", "categories", "category", "banners", "products", "product", "search", "suggestions", "materials", "material", "compatibility"]);
export const isPublicQuery = (query: Query) => PUBLIC_KEYS.has(String(query.queryKey[0]));
export const shouldPersistQuery = (query: Query) => isPublicQuery(query) && defaultShouldDehydrateQuery(query);
export function clearPrivateQueries() {
  const predicate = (query: Query) => !isPublicQuery(query);
  void queryClient.cancelQueries({ predicate });
  queryClient.removeQueries({ predicate });
  queryClient.getMutationCache().clear();
}
export const removeLegacyPrivateCache = () => AsyncStorage.removeItem("hayat.query-cache");
focusManager.setEventListener(setFocused => {
  const subscription = AppState.addEventListener("change", state => setFocused(state === "active"));
  return () => subscription.remove();
});
