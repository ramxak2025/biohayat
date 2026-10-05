import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";

/** Контакты, соцсети, порог бесплатной доставки и обязательный дисклеймер БАД. */
export function useSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: ({ signal }) => api.catalog.settings(signal),
    staleTime: 60 * 60 * 1000,
  });
}

/** Дисклеймер БАД показывать обязательно (требование к рекламе БАД в РФ). */
export function useBadDisclaimer(): string {
  const { data } = useSettings();
  return (
    data?.badDisclaimer ??
    "БАД. НЕ ЯВЛЯЕТСЯ ЛЕКАРСТВЕННЫМ СРЕДСТВОМ. Имеются противопоказания, необходима консультация специалиста."
  );
}
