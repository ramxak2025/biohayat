import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

// Побочный импорт: ставит обработчик уведомлений и слушатель ответов на старте
// приложения, а не при первом открытии вкладки трекера — иначе тап по напоминанию
// из закрытого приложения некому обработать.
import "@/lib/notifications";
import { AppErrorScreen } from "@/components/ui/app-error-screen";
import { sheetScreenOptions } from "@/components/ui/sheet-header";
import { FlyToCartProvider } from "@/components/fx/flight";
import { queryClient, queryPersister, shouldPersistQuery } from "@/lib/query-client";
import { TrackerProvider } from "@/tracker/provider";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme";
import { appFonts } from "@/theme/fonts";

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 400, fade: true });

/**
 * Константа, а НЕ литерал в JSX.
 *
 * PersistQueryClientProvider следит за идентичностью persistOptions: новый объект
 * на каждый рендер перезапускает восстановление кэша, флаг isRestoring никогда не
 * гаснет — и TanStack Query держит ВСЕ запросы на паузе. Внешне это выглядит как
 * «приложение молчит»: ни одного сетевого запроса, ни одной ошибки, пустые экраны.
 */
const PERSIST_OPTIONS = {
  persister: queryPersister,
  dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery, shouldDehydrateMutation: () => false },
  maxAge: 24 * 60 * 60 * 1000,
} as const;

/**
 * Последний рубеж: ошибка рендера в любом экране больше не роняет приложение.
 *
 * Появился после реального падения — старый прод отдавал порог доставки числом,
 * а компонент читал у него поле объекта. Пользователь при этом просто вылетал на
 * рабочий стол, без единого сообщения. Теперь видно, что случилось, и можно
 * продолжить работу.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <AppErrorScreen error={error} onRetry={retry} />;
}

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const { height, fontScale } = useWindowDimensions();
  const sheetOptions = sheetScreenOptions(height, fontScale, theme.colors.surface);
  const hydrate = useAuth((s) => s.hydrate);
  const hydrating = useAuth((s) => s.hydrating);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Прячем сплэш только когда сессия прочитана из Keychain — иначе на секунду
    // мелькает гостевой ЛК у вошедшего пользователя.
    if (!hydrating && (fontsLoaded || fontError)) void SplashScreen.hideAsync();
  }, [hydrating, fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={PERSIST_OPTIONS}
          >
            <StatusBar style={theme.dark ? "light" : "dark"} />
            {/* Оверлей полёта товара в корзину: живёт над всей навигацией,
                иначе копия картинки обрезалась бы границами экрана-источника. */}
            <TrackerProvider>
            <FlyToCartProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              {/* Короткие задачи открываются нативным листом поверх текущего экрана. */}
              <Stack.Screen
                name="auth"
                options={sheetOptions}
              />
              {/* Поиску нужна полная высота для клавиатуры и длинной выдачи. */}
              <Stack.Screen name="search" options={{ presentation: "modal" }} />
            </Stack>
            </FlyToCartProvider>
            </TrackerProvider>
          </PersistQueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
