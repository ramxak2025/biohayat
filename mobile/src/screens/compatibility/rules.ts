import type { CompatibilityRule, CompatibilityType } from "@/api/types";

/** Ключ сравнения: регистр, «ё» и лишние пробелы не должны разводить один и тот же компонент. */
export function normalizeComponent(name: string): string {
  return name.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

/**
 * Список для чипсов: словарь сервера ∪ компоненты правил. Второе обязательно —
 * в правилах встречается «Медь», которой нет в NUTRIENT_KEYWORDS, и без неё
 * пару «Цинк + Медь» было бы невозможно собрать.
 */
export function buildDictionary(
  components: readonly string[] | undefined,
  rules: readonly CompatibilityRule[],
  extra: readonly string[] = [],
): string[] {
  const byKey = new Map<string, string>();
  const add = (raw: string) => {
    const name = raw.trim();
    const key = normalizeComponent(name);
    if (!key || byKey.has(key)) return;
    byKey.set(key, name);
  };

  for (const name of components ?? []) add(name);
  for (const rule of rules) {
    add(rule.componentA);
    add(rule.componentB);
  }
  for (const name of extra) add(name);

  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "ru"));
}

export interface RuleGroup {
  type: CompatibilityType;
  rules: CompatibilityRule[];
}

/** Сначала то, что может навредить. Синергия — приятный бонус, она внизу. */
export const GROUP_ORDER: readonly CompatibilityType[] = ["ANTAGONIST", "CAUTION", "SYNERGY"];

/**
 * Правило показываем, только если выбраны ОБА его компонента. Хранение
 * направленное (A→B), смысл — нет, поэтому сравниваем как неупорядоченную пару.
 * Вся логика клиентская: при переключении чипса запросов не делаем.
 */
export function groupRules(
  rules: readonly CompatibilityRule[],
  selected: ReadonlySet<string>,
): RuleGroup[] {
  const matched = rules.filter(
    (rule) =>
      selected.has(normalizeComponent(rule.componentA)) &&
      selected.has(normalizeComponent(rule.componentB)),
  );

  return GROUP_ORDER.map((type) => ({
    type,
    rules: matched.filter((rule) => rule.type === type),
  })).filter((group) => group.rules.length > 0);
}

/** Сколько пар проверено: C(n, 2). Показываем, чтобы «ничего не найдено» читалось как результат, а не сбой. */
export function pairCount(selectedCount: number): number {
  return selectedCount < 2 ? 0 : (selectedCount * (selectedCount - 1)) / 2;
}

/** Поиск по словарю: без регистра и «ё», по вхождению — компонентов мало, нечёткость не нужна. */
export function matchesQuery(name: string, query: string): boolean {
  const q = normalizeComponent(query);
  return q.length === 0 || normalizeComponent(name).includes(q);
}
