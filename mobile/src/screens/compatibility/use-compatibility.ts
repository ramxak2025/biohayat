import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/endpoints";

/** One atomic versioned response; never mix cached legacy rules with a new dictionary. */
export function useCompatibility() {
  const query = useQuery({
    queryKey: ["compatibility", "evidence", "2026-10-22"],
    queryFn: async ({ signal }) => {
      const data = await api.catalog.compatibilityEvidence(signal);
      if (data.version !== "2026-10-22" || !Array.isArray(data.components) || !Array.isArray(data.rules) || data.rules.some(rule => !rule.sources?.length)) {
        throw new Error("Справочник совместимости обновляется. Попробуйте позже.");
      }
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
  return {
    dictionary: query.data?.components.map(c => c.name) ?? [],
    components: query.data?.components ?? [],
    rules: query.data?.rules ?? [],
    limitations: query.data?.limitations ?? [],
    reviewedAt: query.data?.reviewedAt,
    isLoading: query.isLoading, isRefetching: query.isRefetching,
    error: query.error, refetch: () => { void query.refetch(); },
  };
}
