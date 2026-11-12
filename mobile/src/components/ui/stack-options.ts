import { Platform } from "react-native";
import type { NativeStackNavigationOptions } from "expo-router";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { useColors } from "@/theme";
import { appFont } from "@/theme/fonts";
import { useReduceTransparency } from "./glass-surface";

/**
 * iOS 26 (Liquid Glass) или система постарше.
 *
 * Проверяем через expo-glass-effect, а не по Platform.Version: функция смотрит
 * и версию системы, и версию компилятора, и Info.plist — то есть отвечает ровно
 * на нужный вопрос «нарисует ли UIKit стекло и scroll edge effect». Результат
 * закэширован внутри модуля, звать можно хоть в рендере.
 */
function hasLiquidGlassBars(): boolean {
  return Platform.OS === "ios" && isLiquidGlassAvailable();
}

export interface StackScreenOptionsConfig {
  /**
   * Крупный заголовок, сворачивающийся при скролле.
   *
   * По умолчанию `false`: компактный нативный бар оставляет место для задачи
   * и одинаково работает со списком, ошибкой и пустым состоянием.
   * `true` — явное включение для полноэкранного прокручиваемого содержимого.
   *
   * `false` — всё, что открыто пушем (товар, заказ, статья, форма) и любой
   * экран без скролла. Там сворачивать нечего: UIKit сворачивает крупный
   * заголовок, только отслеживая скролл-вью, а без неё бар навсегда забирает
   * ~52 pt — ровно та «огромная шапка», на которую жалуется клиент.
   */
  largeTitle?: boolean;
  /**
   * Бар лежит ПОВЕРХ контента (`headerTransparent`), контент проходит под ним.
   *
   * По умолчанию `true`, и это не косметика: пока контент не проходит под
   * баром, UIKit нечего размывать — ни Liquid Glass, ни scroll edge effect
   * физически не появятся, останется плоская плашка (разбор — ниже).
   *
   * `false` — запасной вариант для экрана, который не умеет отдавать верхний
   * инсет: контент ляжет строго под баром. Крупный заголовок при этом
   * принудительно выключается, см. комментарий в коде.
   */
  transparent?: boolean;
}

/**
 * Единые screenOptions для всех <Stack> приложения.
 *
 * ── Какой вариант для какого экрана ─────────────────────────────────────────
 *
   *   Корень вкладки (Каталог, Корзина, Приём, Кабинет)
 *       <Stack screenOptions={useStackScreenOptions()} />
   *       компактный заголовок + стекло; главная использует свою марку поверх героя.
 *
 *   Пуш-экран: товар, заказ, статья, оформление, профиль, новый курс, списки
 *       <Stack.Screen options={{ ...useDetailScreenOptions(), title: "…" }} />
 *       компактный заголовок + стекло. Крупный там НЕ ставить — не свернётся.
 *
 *   Экран, который физически не может пустить контент под бар
 *       useStackScreenOptions({ transparent: false })
 *       сплошной брендовый бар, контент начинается под ним.
 *
 * Требование к экрану в первых двух случаях: скролл-контейнер с
 * `contentInsetAdjustmentBehavior="automatic"` (UIKit сам добавит верхний
 * инсет под бар), либо <Screen> из нашего набора — он считает отступ сам.
 *
 * ── Почему раньше «шапка огромная и прилипает уродски» ───────────────────────
 *
 * 1. Крупный заголовок был включён на ВСЕХ экранах всех стеков. На экране со
 *    списком он сворачивается и это уместно; на экране-детали и на любом
 *    экране без скролла он остаётся развёрнутым навсегда и съедает пол-экрана.
 *    Отсюда вариант `{ largeTitle: false }` и `useDetailScreenOptions()`.
 *
 * 2. Бар был закрашен непрозрачным `colors.background`. В
 *    RNSScreenStackHeaderConfig.mm непрозрачный фон уводит UIKit в
 *    `configureWithOpaqueBackground` — плоский прямоугольник, который
 *    ОТКЛЮЧАЕТ и Liquid Glass, и scroll edge effect. Контент под таким баром
 *    обрезается по прямой линии: это и читается как «прилипает уродски».
 *    HIG Toolbars: «Reduce the use of toolbar backgrounds and tinted controls…
 *    use the content layer to inform the color and appearance of the toolbar,
 *    and use a ScrollEdgeEffectStyle when necessary to distinguish the toolbar
 *    area from the content area».
 *    Лечение: прозрачный фон бара (alpha 0 — тот самый признак, по которому
 *    react-native-screens вызывает `configureWithTransparentBackground`)
 *    + `headerTransparent`, чтобы контенту было где идти под баром,
 *    + `scrollEdgeEffects.top = "soft"` — мягкое размытие вместо жёсткой
 *    отбивки (UIScrollEdgeEffectStyle.soft, «a subtle blurred transition»).
 *
 * 3. `headerBackground` СОЗНАТЕЛЬНО не используем: этот проп рисует обычную
 *    JS-вьюху под нативным баром, то есть возвращает ту же нарисованную
 *    плашку, только своими руками. Фон бара — забота UIKit.
 *
 * 4. iOS младше 26 (деплой-таргет проекта — 16.4) про scroll edge effect не
 *    знает, там опция игнорируется. Для неё включаем
 *    `headerBlurEffect: "systemChromeMaterial"` — тот самый материал, которым
 *    UIKit сам красит бары, он сам адаптируется к светлой и тёмной теме.
 *    На iOS 26 блюр НЕ ставим: типы expo-router предупреждают, что
 *    `headerBlurEffect` и `scrollEdgeEffects` вместе накладываются друг на друга.
 *
 * ── Что здесь НЕЛЬЗЯ починить и почему ───────────────────────────────────────
 *
 * Размер заголовка. expo-router всегда подмешивает в `headerTitleStyle` и
 * `headerLargeTitleStyle` шрифт из темы навигации (System 600 / System 700), а
 * react-native-screens, получив семейство или начертание, собирает шрифт
 * фиксированного размера: 17 pt для компактного и 34 pt для крупного
 * (DEFAULT_TITLE_FONT_SIZE / DEFAULT_TITLE_LARGE_FONT_SIZE). Значения совпадают
 * с системными, но за Dynamic Type они не тянутся, и опциями это не
 * отключается. Поэтому свои fontSize/fontWeight мы не задаём (хуже не делаем),
 * а лишним весом в интерфейсе управляем единственным доступным способом —
 * не включая крупный заголовок там, где он не нужен.
 *
 * Цвет заголовка задать ОБЯЗАТЕЛЬНО: если не передать `headerTitleStyle.color`,
 * expo-router подставит туда `headerTintColor`, и заголовок станет брендово
 * зелёным. Берём `colors.text` — он же обслуживает тёмную тему.
 */
export function useStackScreenOptions(
  config: StackScreenOptionsConfig = {},
): NativeStackNavigationOptions {
  const colors = useColors();
  const reduceTransparency = useReduceTransparency();
  const { largeTitle: largeTitleRequested = false, transparent = true } = config;

  /**
   * Крупный заголовок работает только вместе с прозрачным баром. Причина
   * прямо в исходниках expo-router: «The title becomes invisible if background
   * color is set with large title on iOS 26» — поэтому там, где мы вынуждены
   * закрасить бар, крупный заголовок гасим, а не показываем пустое место.
   */
  const largeTitle = transparent && largeTitleRequested;
  const liquidGlass = hasLiquidGlassBars();

  return {
    headerLargeTitleEnabled: largeTitle,
    // бар поверх контента: без этого UIKit кладёт экран строго под баром
    // (edgesForExtendedLayout без .top) и размывать становится нечего
    headerTransparent: transparent,
    // alpha 0 → configureWithTransparentBackground вместо непрозрачной плашки
    headerStyle: { backgroundColor: transparent ? "transparent" : colors.background },
    // фон развёрнутого (крупного) состояния: тоже прозрачный, чтобы крупный
    // заголовок лежал прямо на контенте, как в Настройках и Почте
    headerLargeStyle: { backgroundColor: transparent ? "transparent" : colors.background },
    // на iOS 26 легибельность держит scroll edge effect, на более ранних — блюр
    headerBlurEffect: transparent && !liquidGlass ? "systemChromeMaterial" : undefined,
    /**
     * Верхняя кромка скролла:
     *   soft   — мягкое растворение контента под баром, наш обычный вид;
     *   hard   — плотная кромка с чёткой границей: включаем, когда человек
     *            попросил «Уменьшить прозрачность», там мягкое размытие ему
     *            как раз и мешает;
     *   hidden — бар и так непрозрачный, размывать нечего.
     */
    scrollEdgeEffects: {
      top: transparent ? (reduceTransparency ? "hard" : "soft") : "hidden",
    },
    // своей отбивки не рисуем: её роль играет scroll edge effect
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,

    // Цвет заголовка обязателен — иначе он унаследует брендовый tintColor.
    headerTitleStyle: { color: colors.text, fontFamily: appFont("600") },
    headerLargeTitleStyle: { color: colors.text, fontFamily: appFont("600", true) },
    // Брендовый акцент живёт в tintColor: шеврон «назад» и текстовые кнопки.
    headerTintColor: colors.brand,

    // «Назад»: чистый шеврон без подписи, как в системных приложениях iOS 26
    // (HIG Toolbars: «don't use a text label that says Back or Close»).
    // Зону нажатия НЕ подменяем своим headerLeft — системный UIBarButtonItem
    // держит полную высоту бара (на iOS 26 это стеклянная капсула ≥44 pt) и
    // длинное нажатие с историей стека; кастомная вьюха теряет и то, и другое.
    headerBackButtonDisplayMode: "minimal",
    // обязательно true: при выключенном меню UIKit игнорирует displayMode и
    // возвращает подпись «Назад» (см. backButtonDisplayMode в react-native-screens).
    // По той же причине не задаём headerBackTitleStyle — свой шрифт у подписи
    // выключает space-aware поведение и ужимает кнопку.
    headerBackButtonMenuEnabled: true,

    contentStyle: { backgroundColor: colors.background },
    // свайп-назад обязателен на каждом пуше (HIG: «let people swipe to navigate back»)
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
  };
}

/**
 * Опции для ВЛОЖЕННОГО экрана (товар, заказ, статья, форма, список внутри
 * вкладки): компактный заголовок вместо крупного, стекло остаётся. Ставится на
 * самом экране:
 *   <Stack.Screen options={{ ...useDetailScreenOptions(), title: product.name }} />
 */
export function useDetailScreenOptions(): NativeStackNavigationOptions {
  return useStackScreenOptions({ largeTitle: false });
}

/**
 * Шапка поверх контента для экранов-героев (карточка товара с фото на всю ширину).
 *
 * @deprecated Теперь это поведение по умолчанию — берите `useDetailScreenOptions()`.
 * Обёртка оставлена, чтобы не ломать существующие импорты.
 */
export function useTransparentHeaderOptions(): NativeStackNavigationOptions {
  return useStackScreenOptions({ transparent: true, largeTitle: false });
}
