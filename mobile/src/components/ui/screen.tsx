import { useCallback, useContext, useState, type ReactNode, type RefObject } from "react";
import {
  RefreshControl,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { HeaderHeightContext } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing, useColors } from "@/theme";
import { nativeTabBottomInset } from "./native-tab-inset";

/** Legacy flight animation estimate; native layout insets must not add this height. */
export const TAB_BAR_HEIGHT = 49;

/** Отступ снизу, чтобы контент/футер не попал под нативный таб-бар. */
export function useTabBarInset(withTabBar = true): number {
  const insets = useSafeAreaInsets();
  return nativeTabBottomInset(Platform.OS, insets.bottom, withTabBar);
}

/**
 * Высота нативной шапки текущего экрана (статус-бар + бар, с учётом крупного
 * заголовка). Контекст заполняет навигатор expo-router; вне стека и на экранах
 * с `headerShown: false` там 0 — поэтому хук безопасно звать откуда угодно,
 * в отличие от `useHeaderHeight()`, который в таком случае бросает исключение.
 */
export function useHeaderInset(): number {
  return useContext(HeaderHeightContext) ?? 0;
}

export interface ScreenProps {
  children?: ReactNode;
  /** Обернуть контент в ScrollView. Обязательно для сворачивающегося large title. */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Горизонтальные поля 16 pt (боковое поле экрана по HIG). */
  padded?: boolean;
  background?: "base" | "surface";
  /** Экран внутри вкладок — резервируем место под таб-бар. */
  withTabBar?: boolean;
  /**
   * Шапка лежит поверх контента — так настроен `useStackScreenOptions()` по
   * умолчанию (`transparent: true`). Значение должно совпадать с тем, что
   * передано в опции стека:
   *   useStackScreenOptions()                     → <Screen …>              (по умолчанию)
   *   useStackScreenOptions({ transparent:false })→ <Screen headerTransparent={false} …>
   *
   * Зачем: у прозрачной шапки контент начинается от y=0 и уезжает под бар.
   * Скролл-вариант об этом позаботится сам (`contentInsetAdjustmentBehavior`),
   * а НЕскроллящемуся контенту верхний отступ нужно добавить руками — иначе
   * пустое состояние или ошибка окажутся наполовину под заголовком.
   * У непрозрачной шапки UIKit кладёт экран уже ПОД баром, и свой отступ
   * добавлять нельзя — получится двойной.
   *
   * Нюанс: на экране с КРУПНЫМ заголовком навигатор сначала отдаёт высоту
   * компактного бара и только потом — реальную (он ждёт события от UIKit).
   * Для скролла это незаметно, а НЕскроллящийся контент один раз доедет на
   * ~52 pt вниз. Если это мешает — лучший ответ не костыль, а `scroll`:
   * крупному заголовку всё равно нужна скролл-вью, чтобы сворачиваться.
   */
  headerTransparent?: boolean;
  /** Закреплённая панель снизу (например «В корзину»). Рисуется поверх контента. */
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollRef?: RefObject<ScrollView | null>;
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle" | "refreshControl" | "children">;
  testID?: string;
}

export function Screen({
  children,
  scroll = false,
  refreshing,
  onRefresh,
  padded = true,
  background = "base",
  withTabBar = true,
  headerTransparent = true,
  footer,
  contentContainerStyle,
  style,
  scrollRef,
  scrollProps,
  testID,
}: ScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderInset();
  const bottomInset = nativeTabBottomInset(Platform.OS, insets.bottom, withTabBar);

  /**
   * Реальная высота футера вместо константы «на глаз»: панель покупки в разных
   * состояниях разной высоты (в корзине над ней всплывает тост отмены), и
   * зашитое число либо прятало последний блок, либо оставляло дыру в пол-экрана.
   */
  const [footerHeight, setFooterHeight] = useState(0);
  const onFooterLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    setFooterHeight((prev) => (prev === next ? prev : next));
  }, []);

  const backgroundColor = background === "surface" ? colors.surface : colors.background;
  const padding = padded ? { paddingHorizontal: spacing.base } : null;

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      // без "automatic" нативный large title не сворачивается и не учитываются
      // инсеты баров: именно этот проп заменяет ручной paddingTop под шапкой
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator
      contentContainerStyle={[
        padding,
        // системные инсеты шапки и таб-бара уже добавлены; своими руками
        // добираем только место под плавающим футером и «воздух» под последним блоком
        { paddingBottom: footer ? footerHeight + spacing.base : spacing["2xl"] },
        contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textFaint}
            colors={[colors.brand]}
          />
        ) : undefined
      }
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        padding,
        {
          // прозрачная шапка не сдвигает контент — отступ под неё наш
          paddingTop: headerTransparent ? headerHeight : 0,
          // iOS даёт полный инсет UIKit, Android уже разместил экран над табами
          paddingBottom: bottomInset + (footer ? footerHeight : 0),
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    // Порядок детей важен: react-native-screens ищет скролл-вью, к которой
    // применяет scroll edge effect, обходя ТОЛЬКО первого потомка на каждом
    // уровне (RNSScrollViewFinder). Футер обязан оставаться вторым ребёнком.
    <View collapsable={false} testID={testID} style={[styles.flex, { backgroundColor }, style]}>
      {body}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: bottomInset }]} pointerEvents="box-none">
          <View onLayout={onFooterLayout} pointerEvents="box-none">
            {footer}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
