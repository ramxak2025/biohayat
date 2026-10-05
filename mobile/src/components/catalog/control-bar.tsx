import { useCallback, useState } from "react";
import { Platform, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from "react-native-reanimated";

import { AppText, Divider, GlassSurface, PressableScale } from "@/components/ui";
import { plural } from "@/lib/format";
import { MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";
import { catalogControlsStacked } from "@/lib/display-layout";

import { sortShortLabel, type CatalogSort } from "./sort";

/** Высота панели в покое и в сжатом виде. Разница маленькая — это подстройка, а не трюк. */
export const CONTROL_BAR_HEIGHT = 56;
const CONTROL_BAR_HEIGHT_MIN = 44;
/** За сколько точек прокрутки панель ужимается полностью. */
const COLLAPSE_RANGE = 72;

export interface CatalogControlBarProps {
  /** Сколько товаров в выдаче (Paged.total). */
  total: number;
  /** Идёт первая загрузка или пересчёт под новые фильтры. */
  isCounting: boolean;
  sort: CatalogSort;
  /** Сколько фильтров из листа включено — для точки-индикатора. */
  activeCount: number;
  onOpenSort: () => void;
  onOpenFilters: () => void;
  /**
   * Насколько список уехал от точки покоя, в точках. Пишется из onScroll списка
   * (см. комментарий в экране каталога) и читается только на UI-потоке.
   */
  scrolled: SharedValue<number>;
  /** Высота нативной шапки: панель висит ровно под ней. */
  top: number;
  /** Resting height is also reserved by the list below this overlay. */
  onHeightChange: (height: number) => void;
}

/**
 * Липкая панель управления каталогом: слева — сколько нашлось, справа —
 * сортировка и фильтры.
 *
 * ПОЧЕМУ ПАНЕЛЬ ПЛАВАЕТ, А НЕ ЕДЕТ В ШАПКЕ СПИСКА. Сортировка и фильтры нужны
 * ровно тогда, когда человек уже листает выдачу и понял, что она не та.
 * Уехавшая наверх панель заставляла бы скроллить обратно — поэтому она остаётся
 * на экране, а под ней проходит контент. Это функциональный слой поверх
 * контентного, и материал ему положен тот же, что нативным барам, — Liquid
 * Glass (HIG Materials: стекло — для навигации и управления, никогда для
 * контента). Своего фона у панели нет: она читается продолжением шапки.
 *
 * ПОЧЕМУ УЖИМАЕТСЯ. Пока человек стоит наверху, ему важно «1 240 товаров» —
 * это ответ на вопрос «широкий ли у вас выбор». Когда он листает, важнее сами
 * товары, поэтому панель отдаёт им 12 pt высоты, а счётчик слегка гаснет.
 * Движение привязано к пальцу (HIG: «make motion feel like a natural response
 * to the gesture»), считается на UI-потоке и полностью выключается при
 * включённом «Уменьшении движения».
 */
export function CatalogControlBar({
  total,
  isCounting,
  sort,
  activeCount,
  onOpenSort,
  onOpenFilters,
  scrolled,
  top,
  onHeightChange,
}: CatalogControlBarProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const { width, fontScale } = useWindowDimensions();
  const stacked = catalogControlsStacked(width, fontScale) || isCounting;
  const [contentHeight, setContentHeight] = useState(CONTROL_BAR_HEIGHT_MIN);
  const restingHeight = Math.max(CONTROL_BAR_HEIGHT, contentHeight + spacing.md);
  const onContentLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.height);
    setContentHeight((previous) => previous === next ? previous : next);
    onHeightChange(Math.max(CONTROL_BAR_HEIGHT, next + spacing.md));
  }, [onHeightChange]);

  const countLabel = isCounting
    ? "Подбираем товары…"
    : // неразрывный пробел в разряде — чтобы «1 240» никогда не переносилось
      `${total.toLocaleString("ru-RU").replace(/\s/g, "\u00a0")}\u00a0${plural(total, "товар", "товара", "товаров")}`;

  const shellStyle = useAnimatedStyle(() => {
    if (reduced || stacked) return { height: restingHeight };
    const progress = interpolate(scrolled.value, [0, COLLAPSE_RANGE], [0, 1], Extrapolation.CLAMP);
    return {
      height: interpolate(progress, [0, 1], [restingHeight, Math.max(CONTROL_BAR_HEIGHT_MIN, contentHeight)]),
    };
  });

  const paddingStyle = useAnimatedStyle(() => {
    if (reduced || stacked) return { paddingVertical: spacing.md / 2 };
    return { paddingVertical: interpolate(scrolled.value, [0, COLLAPSE_RANGE], [spacing.md / 2, 0], Extrapolation.CLAMP) };
  });

  const countStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1 };
    const progress = interpolate(scrolled.value, [0, COLLAPSE_RANGE], [0, 1], Extrapolation.CLAMP);
    // счётчик не убираем совсем: он остаётся якорем «сколько всего нашлось»
    return { opacity: interpolate(progress, [0, 1], [1, 0.65]) };
  });

  // отбивка появляется только когда под панель что-то заехало: на нетронутом
  // экране лишняя линия делит его пополам без всякой причины
  const edgeStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1 };
    return {
      opacity: interpolate(scrolled.value, [0, 24], [0, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View style={[styles.shell, { top }, shellStyle]}>
      <GlassSurface style={styles.glass}>
        <Animated.View style={paddingStyle}>
          <View style={[styles.row, stacked ? styles.stackedRow : null]} onLayout={onContentLayout}>
            <Animated.View style={[styles.count, countStyle]}>
              <AppText variant="subhead" color="muted" maxScale={1.4}>
                {countLabel}
              </AppText>
            </Animated.View>

            <View style={[styles.actions, stacked ? styles.stackedActions : null]}>
              <BarButton
                icon="arrow.up.arrow.down"
                label={sortShortLabel(sort)}
                accessibilityLabel={`Сортировка: ${sortShortLabel(sort)}`}
                accessibilityHint="Открывает список вариантов сортировки"
                onPress={onOpenSort}
                expanded={stacked}
              />

              <Divider vertical style={styles.separator} />

              <BarButton
                icon="line.3.horizontal.decrease"
                label="Фильтры"
                marked={activeCount > 0}
                accessibilityLabel={
                  activeCount > 0 ? `Фильтры, выбрано ${activeCount}` : "Фильтры"
                }
                accessibilityHint="Открывает фильтры каталога"
                onPress={onOpenFilters}
                expanded={stacked}
              />
            </View>
          </View>
        </Animated.View>
      </GlassSurface>

      <Animated.View
        style={[styles.edge, { backgroundColor: colors.line }, edgeStyle]}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

interface BarButtonProps {
  icon: SFSymbol;
  label: string;
  /** Точка-индикатор: что-то выбрано. */
  marked?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  expanded?: boolean;
}

/**
 * Кнопка панели — без собственной заливки.
 *
 * Поверх стекла нельзя класть ещё одно стекло, а плотная плашка на нём выглядит
 * наклейкой (WWDC25: элементы НА стекле рисуются заливками и вибрантностью,
 * «как часть материала»). Поэтому здесь только глиф и подпись, а зона нажатия
 * добирается слопом до 44 pt даже когда панель ужалась.
 */
function BarButton({ icon, label, marked, accessibilityLabel, accessibilityHint, onPress, expanded }: BarButtonProps) {
  const colors = useColors();

  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[styles.button, expanded ? styles.expandedButton : null]}
    >
      <SymbolView name={icon} size={15} tintColor={colors.text} weight="semibold" />
      <AppText variant="subhead" weight="600" maxScale={1.3} style={styles.buttonLabel}>
        {label}
      </AppText>
      {marked ? (
        <View style={[styles.dot, { backgroundColor: colors.brand, borderColor: colors.surface }]} />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  shell: { position: "absolute", left: 0, right: 0, zIndex: 2 },
  glass: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  stackedRow: { flexDirection: "column", alignItems: "stretch", gap: spacing.xs },
  count: { flexShrink: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stackedActions: { alignSelf: "stretch" },
  separator: { height: 18, alignSelf: "center" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    minHeight: Platform.OS === "android" ? 48 : MIN_TAP_SIZE,
    flexShrink: 1,
  },
  expandedButton: { flex: 1 },
  buttonLabel: { flexShrink: 1 },
  // точка вместо числа: сколько именно фильтров включено, человек увидит в листе,
  // а на панели важен один бит — «что-то выбрано»
  dot: { width: 8, height: 8, borderRadius: radii.pill, borderWidth: 1.5, marginLeft: -2 },
  edge: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
