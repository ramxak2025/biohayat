import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { CompatibilityRule } from "@/api/types";

import { buildDictionary } from "./rules";

export interface CompatibilityData {
  /** Базовый словарь компонентов для чипсов, отсортирован по-русски. */
  dictionary: string[];
  rules: CompatibilityRule[];
  isLoading: boolean;
  isRefetching: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Справочники совместимости. Оба запроса публичные и почти неизменные —
 * держим их свежими полчаса, чтобы возврат на экран был мгновенным.
 */
export function useCompatibility(): CompatibilityData {
  const rulesQuery = useQuery({
    queryKey: qk.compatibilityRules,
    queryFn: ({ signal }) => api.catalog.compatibilityRules(signal),
    staleTime: 30 * 60 * 1000,
  });

  const componentsQuery = useQuery({
    queryKey: qk.compatibilityComponents,
    queryFn: ({ signal }) => api.catalog.compatibilityComponents(signal),
    staleTime: 30 * 60 * 1000,
  });

  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data]);

  const dictionary = useMemo(
    () => buildDictionary(componentsQuery.data, rules),
    [componentsQuery.data, rules],
  );

  const refetch = useCallback(() => {
    void rulesQuery.refetch();
    void componentsQuery.refetch();
  }, [rulesQuery, componentsQuery]);

  return {
    dictionary,
    rules,
    isLoading: rulesQuery.isLoading || componentsQuery.isLoading,
    isRefetching: rulesQuery.isRefetching || componentsQuery.isRefetching,
    // Оба источника обязательны; ошибка не должна выглядеть как отсутствие взаимодействий.
    error: rulesQuery.error ?? componentsQuery.error,
    refetch,
  };
}
