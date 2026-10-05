import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Category, Taxonomy } from "@/api/types";
import {
  AppText,
  Button,
  Chip,
  Divider,
  ErrorState,
  Input,
  PressableScale,
  Skeleton,
} from "@/components/ui";
import { plural } from "@/lib/format";
import { HIT_SLOP, MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

import { SORT_OPTIONS } from "./sort";
import { useCatalogCount } from "./use-catalog-products";
import {
  buildCatalogQuery,
  countActiveFilters,
  EMPTY_FILTERS,
  type CatalogFilters,
} from "./use-catalog-filters";

const SKELETON_WIDTHS = [120, 96, 140, 104, 128, 88];

/** Пауза перед пересчётом: цену набирают посимвольно, запрос на каждую цифру не нужен. */
const COUNT_DEBOUNCE_MS = 300;

/** Потолок ввода цены: семь цифр — это 9 999 999 ₽, выше в каталоге БАД ничего нет. */
const MAX_PRICE_DIGITS = 7;

export interface CatalogFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Применённый набор: черновик пересевается от него на каждом открытии. */
  applied: CatalogFilters;
  onApply: (next: CatalogFilters) => void;
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: unknown;
  onRetryCategories: () => void;
  taxonomy: Taxonomy | undefined;
  taxonomyLoading: boolean;
  taxonomyError: unknown;
  onRetryTaxonomy: () => void;
}

/** "1290" → 129000 копеек. Пустая строка и ноль означают «границы нет». */
function parseRubles(text: string): number | undefined {
  const digits = text.replace(/\D/g, "").slice(0, MAX_PRICE_DIGITS);
  if (!digits) return undefined;
  const rubles = Number(digits);
  return rubles > 0 ? rubles * 100 : undefined;
}

function formatRubles(kopecks: number | undefined): string {
  return kopecks === undefined ? "" : String(Math.round(kopecks / 100));
}

/**
 * Границы «от 3000» и «до 500» человек вводит регулярно — просто перепутав поля.
 * Молча отдать серверу пустую выборку было бы издевательством, поэтому меняем
 * их местами: смысл ввода очевиден, а спорить с пользователем незачем.
 */
function normalizePrice(filters: CatalogFilters): CatalogFilters {
  const { priceFrom, priceTo } = filters;
  if (priceFrom !== undefined && priceTo !== undefined && priceFrom > priceTo) {
    return { ...filters, priceFrom: priceTo, priceTo: priceFrom };
  }
  return filters;
}

/**
 * Полный набор фильтров каталога.
 *
 * ПОЧЕМУ ЛИСТ, А НЕ ИНЛАЙН-ПАНЕЛЬ. HIG (Sheets, таблица «Sheet vs push») прямо
 * относит фильтры к листу: «a scoped task that's closely related to their
 * current context». Решает и арифметика: 17 категорий, 3 аудитории и 9 целей —
 * 29 чипсов плюс цена и переключатели. Развёрнутые в шапке списка они съели бы
 * экран целиком.
 *
 * ПОЧЕМУ Modal presentationStyle="pageSheet", А НЕ Stack presentation="formSheet".
 * Маршрутный лист требует отдельного файла в src/app — эта директория
 * принадлежит тимлиду. `Modal` с `presentationStyle="pageSheet"` показывает
 * НАСТОЯЩИЙ UIKit-лист: iOS 26 сама рисует увеличенный радиус, отступ от краёв
 * и просвет контента снизу, работает свайп вниз.
 *
 * ПОЧЕМУ ЧЕРНОВИК, А НЕ ПРИМЕНЕНИЕ НА ЛЕТУ. Выбор фильтра меняет выдачу, а
 * выдача спрятана под листом — применять сразу значит гонять сеть вслепую. Здесь
 * выбор копится в черновике, а внизу живым числом («Показать 42 товара») видно,
 * к чему он приведёт. Число берём отдельным запросом в ОДИН товар: сервер всё
 * равно считает total по всей выборке, тянуть ради счётчика целую страницу
 * незачем. Закрытие свайпом или крестиком черновик выбрасывает — это ожидаемое
 * поведение листа, поэтому применение вынесено в явную кнопку.
 */
export function CatalogFilterSheet({
  visible,
  onClose,
  applied,
  onApply,
  categories,
  categoriesLoading,
  categoriesError,
  onRetryCategories,
  taxonomy,
  taxonomyLoading,
  taxonomyError,
  onRetryTaxonomy,
}: CatalogFilterSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<CatalogFilters>(applied);
  // цена живёт отдельной строкой ввода: в копейках её не наберёшь, а держать в
  // черновике «полуцифру» вроде 15 (то есть 15 ₽ на пути к 1500) нельзя
  const [fromText, setFromText] = useState(() => formatRubles(applied.priceFrom));
  const [toText, setToText] = useState(() => formatRubles(applied.priceTo));
  const [seed, setSeed] = useState(applied);

  /**
   * Лист открыли заново — черновик пересевается от применённого набора.
   *
   * Правка состояния прямо в рендере, а не в эффекте: так React предписывает
   * «adjusting state when a prop changes» — он выбросит незавершённый рендер и
   * тут же перерисует компонент, без лишнего кадра и без каскада эффектов.
   * Сравниваем по ссылке: `applied` — неизменяемый объект, новый появляется
   * ровно на каждое применение фильтров.
   */
  if (visible && seed !== applied) {
    setSeed(applied);
    setDraft(applied);
    setFromText(formatRubles(applied.priceFrom));
    setToText(formatRubles(applied.priceTo));
  }

  const candidate = useMemo(
    () =>
      normalizePrice({
        ...draft,
        priceFrom: parseRubles(fromText),
        priceTo: parseRubles(toText),
      }),
    [draft, fromText, toText],
  );

  const debounced = useDebounced(candidate, COUNT_DEBOUNCE_MS);
  const count = useCatalogCount(buildCatalogQuery(debounced), visible);

  const activeCount = countActiveFilters(candidate);
  // пересчёт идёт и когда число ещё не приходило, и когда набранная цена ещё не
  // доехала до запроса: и там, и там показывать старое число нельзя
  const isCounting = count.isPending || count.isFetching || debounced !== candidate;
  const total = count.data ?? 0;

  const setAxis = (axis: "category" | "audience" | "goal", slug: string) => {
    setDraft((prev) => {
      const value = prev[axis] === slug ? undefined : slug;
      if (axis === "category") return { ...prev, category: value };
      if (axis === "audience") return { ...prev, audience: value };
      return { ...prev, goal: value };
    });
  };

  const resetDraft = () => {
    // поиск оставляем: он пришёл с другого экрана, его в этом листе не видно,
    // и стирать невидимое — значит удивлять
    setDraft({ ...EMPTY_FILTERS, q: draft.q });
    setFromText("");
    setToText("");
  };

  const apply = () => {
    onApply(candidate);
    onClose();
  };

  const canReset = activeCount > 0 || candidate.sort !== EMPTY_FILTERS.sort;
  const nothingFound = !isCounting && total === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal
      // иначе на время выезда под листом мигает белая подложка RN в тёмной теме
      backdropColor={colors.surface}
      onRequestClose={onClose}
      // свайп вниз закрывает лист силами системы, но состояние `visible` об этом
      // не узнает — без onDismiss лист больше не откроется
      onDismiss={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.sheet, { backgroundColor: colors.surface }]}
      >
        <View style={styles.bar}>
          <View style={styles.barSide} />

          <AppText variant="headline" accessibilityRole="header">
            Фильтры
          </AppText>

          <View style={[styles.barSide, styles.barTrailing]}>
            <PressableScale
              onPress={onClose}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Закрыть фильтры без применения"
              style={styles.barAction}
            >
              <AppText variant="callout" color="brand" weight="600">
                Закрыть
              </AppText>
            </PressableScale>
          </View>
        </View>

        <Divider />

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
        >
          <Section title="Сортировка">
            {SORT_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.title}
                selected={draft.sort === option.value}
                onPress={() => setDraft((prev) => ({ ...prev, sort: option.value }))}
              />
            ))}
          </Section>

          <Section title="Цена, ₽" inline={false}>
            <View style={styles.priceRow}>
              <Input
                value={fromText}
                onChangeText={(value) => setFromText(value.replace(/\D/g, "").slice(0, MAX_PRICE_DIGITS))}
                label="от"
                placeholder="0"
                inputMode="numeric"
                keyboardType="number-pad"
                maxLength={MAX_PRICE_DIGITS}
                accessibilityLabel="Цена от, рублей"
                containerStyle={styles.priceField}
              />
              <Input
                value={toText}
                onChangeText={(value) => setToText(value.replace(/\D/g, "").slice(0, MAX_PRICE_DIGITS))}
                label="до"
                placeholder="Любая"
                inputMode="numeric"
                keyboardType="number-pad"
                maxLength={MAX_PRICE_DIGITS}
                accessibilityLabel="Цена до, рублей"
                containerStyle={styles.priceField}
              />
            </View>
          </Section>

          <Section title="Показывать" inline={false}>
            <View style={[styles.switches, { borderColor: colors.line }]}>
              <SwitchRow
                label="Только со скидкой"
                value={draft.onSale}
                onChange={(value) => setDraft((prev) => ({ ...prev, onSale: value }))}
              />
              <Divider inset={spacing.base} />
              <SwitchRow
                label="Только в наличии"
                value={draft.inStock}
                onChange={(value) => setDraft((prev) => ({ ...prev, inStock: value }))}
              />
              <Divider inset={spacing.base} />
              <SwitchRow
                label="Только хиты продаж"
                value={draft.featured}
                onChange={(value) => setDraft((prev) => ({ ...prev, featured: value }))}
              />
            </View>
          </Section>

          <Section title="Категории">
            {categoriesError && categories.length === 0 ? (
              <ErrorState
                error={categoriesError}
                onRetry={onRetryCategories}
                compact
                style={styles.state}
              />
            ) : categoriesLoading && categories.length === 0 ? (
              <ChipSkeletons />
            ) : (
              categories.map((category) => (
                <Chip
                  key={category.slug}
                  label={category.name}
                  selected={draft.category === category.slug}
                  onPress={() => setAxis("category", category.slug)}
                />
              ))
            )}
          </Section>

          {taxonomyError && !taxonomy ? (
            <Section title="Кому и зачем">
              <ErrorState
                error={taxonomyError}
                onRetry={onRetryTaxonomy}
                compact
                style={styles.state}
              />
            </Section>
          ) : (
            <>
              <Section title="Кому">
                {taxonomyLoading && !taxonomy ? (
                  <ChipSkeletons count={3} />
                ) : (
                  (taxonomy?.audiences ?? []).map((item) => (
                    <Chip
                      key={item.slug}
                      label={item.name}
                      selected={draft.audience === item.slug}
                      onPress={() => setAxis("audience", item.slug)}
                    />
                  ))
                )}
              </Section>

              <Section title="Зачем">
                {taxonomyLoading && !taxonomy ? (
                  <ChipSkeletons />
                ) : (
                  (taxonomy?.goals ?? []).map((item) => (
                    <Chip
                      key={item.slug}
                      label={item.name}
                      selected={draft.goal === item.slug}
                      onPress={() => setAxis("goal", item.slug)}
                    />
                  ))
                )}
              </Section>
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.line,
              paddingBottom: Math.max(insets.bottom, spacing.base),
            },
          ]}
        >
          <Button
            title="Сбросить"
            variant="secondary"
            size="lg"
            disabled={!canReset}
            onPress={resetDraft}
            haptic="medium"
            accessibilityLabel="Сбросить все фильтры"
            style={styles.reset}
          />
          <Button
            title={
              isCounting
                ? "Показать товары"
                : nothingFound
                  ? "Ничего не найдено"
                  : `Показать ${total} ${plural(total, "товар", "товара", "товаров")}`
            }
            variant="primary"
            size="lg"
            loading={isCounting}
            disabled={nothingFound}
            onPress={apply}
            style={styles.apply}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Значение, отстающее от быстро меняющегося источника — чтобы не дёргать сеть. */
function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}

function Section({
  title,
  children,
  inline = true,
}: {
  title: string;
  children: ReactNode;
  /** Чипсы раскладываются в строку с переносом; поля и переключатели — колонкой. */
  inline?: boolean;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="footnote" color="muted" weight="600" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </AppText>
      <View style={inline ? styles.chips : undefined}>{children}</View>
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const colors = useColors();

  return (
    // вся строка — зона нажатия: попасть в 51-точечный тумблер пальцем на ходу
    // тяжело, а HIG требует минимум 44 pt на любое действие
    <PressableScale
      onPress={() => onChange(!value)}
      haptic="none"
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={styles.switchRow}
    >
      <AppText variant="callout" numberOfLines={2} style={styles.switchLabel}>
        {label}
      </AppText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceSunken, true: colors.brand }}
        // тумблер озвучивает строка целиком — иначе VoiceOver читает его дважды
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </PressableScale>
  );
}

function ChipSkeletons({ count = SKELETON_WIDTHS.length }: { count?: number }) {
  return (
    <>
      {SKELETON_WIDTHS.slice(0, count).map((width, index) => (
        <Skeleton key={index} width={width} height={38} radius={radii.pill} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    // лист презентуется системой, своей безопасной зоны сверху у него нет
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  // без выравнивания заголовок съезжает с центра листа
  barSide: { flex: 1, alignItems: "flex-start" },
  barTrailing: { alignItems: "flex-end" },
  barAction: { minHeight: MIN_TAP_SIZE, justifyContent: "center" },
  body: { paddingHorizontal: spacing.base, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.md, letterSpacing: 0.6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  state: { width: "100%", paddingVertical: spacing.base },
  priceRow: { flexDirection: "row", gap: spacing.md },
  priceField: { flex: 1 },
  switches: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: MIN_TAP_SIZE + 6,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  switchLabel: { flex: 1 },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // «Показать» шире «Сбросить»: это главное действие листа
  reset: { flex: 1 },
  apply: { flex: 2 },
});
