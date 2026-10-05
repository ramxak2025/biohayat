import { sessionGeneration } from "@/lib/session-generation";
import { ApiError } from "@/api/client";
import { useCallback, useMemo, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import { useAuth } from "@/store/auth";
import { useGuestFavorites } from "@/store/favorites";
import type { Product } from "@/api/types";

/**
 * Единая точка работы с избранным для всех экранов.
 * Гость — локальный список; вошедший — сервер с оптимистичным обновлением.
 */
export function useFavorites() {
  const token = useAuth((s) => s.token);
  const guestIds = useGuestFavorites((s) => s.ids);
  const toggleGuest = useGuestFavorites((s) => s.toggle);
  const qc = useQueryClient();
  const epoch = sessionGeneration();
  const queryKey = qk.favorites;
  useEffect(() => {
    if (token && guestIds.length) void mergeGuestFavorites().then(() => { if (epoch === sessionGeneration()) void qc.invalidateQueries({ queryKey }); });
  }, [token, guestIds.length, epoch, qc]);

  const serverQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => api.favorites.list(signal),
    enabled: !!token,
  });

  const ids = useMemo(
    () => new Set(token ? (serverQuery.data ?? []).map((p) => p.id) : guestIds),
    [token, serverQuery.data, guestIds],
  );

  const mutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) =>
      {
        if (epoch !== sessionGeneration()) throw new ApiError(409, "Сессия изменилась", "SESSION_CHANGED");
        return next ? api.favorites.add(id) : api.favorites.remove(id);
      },
    onMutate: async ({ id, next }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<Product[]>(queryKey);
      if (!prev) return { prev };
      if (epoch !== sessionGeneration()) return { prev: undefined };
      if (!next) qc.setQueryData<Product[]>(queryKey, prev.filter(p => p.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (epoch === sessionGeneration() && ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const toggle = useCallback(
    (productId: string) => {
      // Добавление — маленький праздник, снятие — нет: так же ведут себя
      // системные приложения, и двойная хаптика на toggle быстро надоедает.
      if (!ids.has(productId)) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!token) {
        toggleGuest(productId);
        return;
      }
      mutation.mutate({ id: productId, next: !ids.has(productId) });
    },
    [token, ids, toggleGuest, mutation],
  );

  return {
    ids,
    items: serverQuery.data ?? [],
    isLoading: !!token && serverQuery.isLoading,
    isFavorite: useCallback((id: string) => ids.has(id), [ids]),
    toggle,
  };
}

/** После входа переносим гостевое избранное на сервер и чистим локальное. */
let mergeInFlight: { epoch: number; promise: Promise<void> } | undefined;
export async function mergeGuestFavorites() {
  const epoch = sessionGeneration();
  if (mergeInFlight?.epoch === epoch) return mergeInFlight.promise;
  if (!useAuth.getState().token) return;
  const ids = [...useGuestFavorites.getState().ids];
  if (!ids.length) return;
  const promise = (async () => {
    try {
      for (let offset = 0; offset < ids.length; offset += 100) {
        if (epoch !== sessionGeneration()) return;
        const batch = ids.slice(offset, offset + 100);
        await api.favorites.merge(batch);
        if (epoch !== sessionGeneration()) return;
        useGuestFavorites.setState(state => ({ ids: state.ids.filter(id => !batch.includes(id)) }));
      }
    } catch { /* Keep unconfirmed guest IDs for retry on the next mount. */ }
  })();
  mergeInFlight = { epoch, promise };
  await promise;
  if (mergeInFlight?.epoch === epoch) mergeInFlight = undefined;
}
