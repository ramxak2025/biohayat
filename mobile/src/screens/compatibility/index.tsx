import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { Stack, useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import {
  AppText,
  BadDisclaimer,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PressableScale,
  Screen,
  Skeleton,
  useDetailScreenOptions,
} from "@/components/ui";
import { onSessionChanged, sessionGeneration } from "@/lib/session-generation";
import { plural } from "@/lib/format";
import { useIsAuthenticated } from "@/store/auth";
import { Duration, radii, spacing, useColors } from "@/theme";

import { CleanResult } from "./clean-result";
import { ComponentPicker } from "./component-picker";
import { RuleGroupBlock } from "./rule-group";
import { buildDictionary, groupRules, normalizeComponent, pairCount } from "./rules";
import { ScanSummary } from "./scan-summary";
import { useCompatibility } from "./use-compatibility";
import { useCourseImport } from "./use-course-import";

/** Пустая карта одна на всё приложение: стабильная ссылка не дёргает чипсы лишним рендером. */
const NO_IMPORTS: ReadonlyMap<string, number> = new Map();

export function CompatibilityScreen() {
  const generation = useSyncExternalStore(onSessionChanged, sessionGeneration, sessionGeneration);
  return <CompatibilitySession key={generation} />;
}

/** Remount on every identity boundary: selections and course titles never survive logout/login. */
function CompatibilitySession() {
  const colors = useColors();
  const router = useRouter();
  const detailOptions = useDetailScreenOptions();
  const reduced = useReducedMotion();
  const isAuthenticated = useIsAuthenticated();

  const { dictionary: base, components = [], limitations = [], reviewedAt, rules, isLoading, isRefetching, error, refetch } = useCompatibility();

  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [courseComponents, setCourseComponents] = useState<readonly string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  /** Очередь прилёта чипсов из курсов: ключ → позиция. Живёт до следующего действия пользователя. */
  const [importedRanks, setImportedRanks] = useState<ReadonlyMap<string, number>>(NO_IMPORTS);

  const { importing, run: runImport } = useCourseImport(base);

  /** Компоненты из курсов могут быть шире серверного словаря — доклеиваем их к списку чипсов. */
  const dictionary = useMemo(
    () => buildDictionary(base, rules, courseComponents),
    [base, rules, courseComponents],
  );

  const toggle = useCallback((name: string) => {
    const key = normalizeComponent(name);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setNotice(null);
    // следующее касание отменяет «прилёт»: иначе чипс уехал бы с чужой задержкой
    setImportedRanks(NO_IMPORTS);
  }, []);

  const clear = useCallback(() => {
    setSelectedKeys(new Set<string>());
    setImportWarnings([]);
    setNotice(null);
    setImportedRanks(NO_IMPORTS);
  }, []);

  const importFromCourses = useCallback(() => {
    setNotice(null);
    const generation = sessionGeneration();
    void runImport()
      .then(({ components, planCount, unassessedPlans = [], overlappingComponents = [] }) => {
        if (generation !== sessionGeneration()) return;
        setImportWarnings([
          ...unassessedPlans.map(title => `Не оценён полный состав: ${title}`),
          ...(overlappingComponents.length ? [`Повторяются в нескольких курсах: ${overlappingComponents.join(", ")}. Суммарная доза не рассчитана.`] : []),
        ]);
        if (components.length === 0) {
          setNotice(
            planCount === 0
              ? "Активных курсов приёма пока нет — отметьте компоненты вручную."
              : "В ваших курсах не нашлось известных компонентов.",
          );
          return;
        }

        setCourseComponents(components);
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          for (const name of components) next.add(normalizeComponent(name));
          return next;
        });
        setImportedRanks(new Map(components.map((name, i) => [normalizeComponent(name), i])));
        // Отклик на подстановку компонентов не означает успешную проверку совместимости.
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setNotice(
          `Отметили ${components.length} ${plural(components.length, "компонент", "компонента", "компонентов")} из ${planCount} ${plural(planCount, "курса", "курсов", "курсов")}.`,
        );
      })
      .catch(() => {
        if (generation !== sessionGeneration()) return;
        setNotice("Не удалось загрузить курсы приёма. Попробуйте ещё раз.");
      });
  }, [runImport]);

  const groups = useMemo(() => groupRules(rules, selectedKeys), [rules, selectedKeys]);

  const selectedCount = selectedKeys.size;
  const pairs = pairCount(selectedCount);

  const header = <Stack.Screen options={{ ...detailOptions, title: "Совместимость" }} />;

  if (isLoading) {
    return (
      <>
        {header}
        <Screen scroll>
          <Skeleton height={96} radius={radii["2xl"]} style={styles.introSkeleton} />
          <Skeleton width="55%" height={22} style={styles.titleSkeleton} />
          <ListSkeleton variant="line" count={5} />
        </Screen>
      </>
    );
  }

  if (error) {
    return (
      <>
        {header}
        <Screen>
          <View style={styles.center}>
            <ErrorState error={error} onRetry={refetch} />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      {header}
      <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
        <Card tone="brand" style={styles.intro}>
          <View style={styles.introRow}>
            <View style={[styles.introIcon, { backgroundColor: colors.surface }]}>
              <SymbolView name="testtube.2" size={18} tintColor={colors.brand} />
            </View>
            <AppText variant="headline" style={styles.introTitle}>
              Проверка сочетаний
            </AppText>
          </View>

          <AppText variant="subhead" color="muted" style={styles.introText}>
            Отметьте компоненты, которые принимаете, — покажем сведения из базы об их
            взаимодействиях.
          </AppText>

          {isAuthenticated ? (
            <Button
              title="Взять из моих курсов"
              variant="secondary"
              size="sm"
              leftIcon="pills"
              loading={importing}
              onPress={importFromCourses}
              accessibilityHint="Отметит компоненты из активных курсов приёма"
              style={styles.introAction}
            />
          ) : (
            <Button
              title="Войти и подтянуть курсы"
              variant="secondary"
              size="sm"
              leftIcon="person.crop.circle"
              onPress={() => router.push("/auth" as Href)}
              style={styles.introAction}
            />
          )}
        </Card>

        {notice ? (
          <Animated.View
            entering={reduced ? undefined : FadeIn.duration(Duration.fast)}
            style={[styles.notice, { backgroundColor: colors.surfaceSunken }]}
            accessibilityLiveRegion="polite"
          >
            <SymbolView name="info.circle" size={14} tintColor={colors.textMuted} />
            <AppText variant="footnote" color="muted" style={styles.noticeText}>
              {notice}
            </AppText>
          </Animated.View>
        ) : null}

        <View style={styles.pickerHeader}>
          <View style={styles.pickerTitles}>
            <AppText variant="title3">Что вы принимаете?</AppText>
            <AppText variant="footnote" color="muted" style={styles.pickerSubtitle}>
              {selectedCount > 0
                ? `Выбрано ${selectedCount} из ${dictionary.length}`
                : `${dictionary.length} ${plural(dictionary.length, "компонент", "компонента", "компонентов")} на выбор`}
            </AppText>
          </View>

          {selectedCount > 0 ? (
            <Button title="Очистить" variant="ghost" size="sm" onPress={clear} />
          ) : null}
        </View>

        <ComponentPicker
          components={dictionary}
          selectedKeys={selectedKeys}
          importedRanks={importedRanks}
          onToggle={toggle}
        />

        {importWarnings.map(message => <AppText key={message} variant="footnote" color="muted" style={{ marginTop: spacing.sm }}>{message}</AppText>)}
        <Divider style={styles.divider} />

        {selectedCount < 2 ? (
          <EmptyState
            compact
            icon="hand.tap"
            title="Выберите минимум два компонента"
            subtitle="Для парного сравнения отметьте два компонента. Сведения о каждом выбранном веществе приведены ниже."
          />
        ) : (
          <>
            <ScanSummary pairs={pairs} groups={groups} />

            {groups.length > 0 ? (
              <View style={styles.groups}>
                {groups.map((group, index) => (
                  <RuleGroupBlock key={group.type} group={group} groupIndex={index} />
                ))}
              </View>
            ) : (
              <CleanResult />
            )}
          </>
        )}

        {selectedCount > 0 ? <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <AppText variant="title3">Что ещё учитывать</AppText>
          {components.filter(component => selectedKeys.has(normalizeComponent(component.name))).map(component => <View key={component.name}>
            <AppText variant="headline">{component.name}</AppText>
            <AppText variant="subhead" color="muted" style={{ marginTop: spacing.xs }}>{component.note}</AppText>
            {component.sources.map(source => <PressableScale key={source.url} accessibilityRole="link" haptic="none" style={{ minHeight: 44, justifyContent: "center" }} onPress={() => { void WebBrowser.openBrowserAsync(source.url); }}>
              <AppText variant="footnote" color="brand">{source.title} ↗</AppText>
            </PressableScale>)}
          </View>)}
        </View> : null}
        <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
          {limitations.map(text => <AppText key={text} variant="footnote" color="muted">{text}</AppText>)}
          {reviewedAt ? <AppText variant="caption" color="faint">Редакция справочника: {reviewedAt}</AppText> : null}
        </View>

        <Card tone="soft" elevated={false} style={styles.disclaimer}>
          <SymbolView name="info.circle" size={15} tintColor={colors.textMuted} />
          <AppText variant="footnote" color="muted" style={styles.disclaimerText}>
            Информация носит справочный характер и не является медицинской рекомендацией.
            Результат не заменяет консультацию специалиста.
          </AppText>
        </Card>

        <Button
          title="Спросить нутрициолога"
          variant="outline"
          leftIcon="bubble.left.and.text.bubble.right"
          fullWidth
          onPress={() => router.push("/account/consultation")}
          style={styles.consultation}
        />

        <BadDisclaimer variant="compact" style={styles.bad} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center" },
  introSkeleton: { marginTop: spacing.base, marginBottom: spacing.xl },
  titleSkeleton: { marginBottom: spacing.base },

  intro: { marginTop: spacing.base },
  introRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  introIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  introTitle: { flex: 1 },
  introText: { marginTop: spacing.sm },
  introAction: { marginTop: spacing.base, alignSelf: "flex-start" },

  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  noticeText: { flex: 1 },

  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  pickerTitles: { flex: 1 },
  pickerSubtitle: { marginTop: 2 },

  divider: { marginVertical: spacing.xl },

  groups: { gap: spacing.xl },

  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing["2xl"],
  },
  disclaimerText: { flex: 1 },
  consultation: { marginTop: spacing.base },
  bad: { marginTop: spacing.lg },
});
