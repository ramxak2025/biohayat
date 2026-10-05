"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getFavoriteState, mergeGuestFavorites, setFavorite } from "@/app/actions/favorites";
import { useAuthKey } from "@/lib/use-auth-flag";

// The old key mixed account and guest lists; it must never be uploaded again.
const STORAGE_KEY = "hayat_guest_favorites_v2";
function readGuest(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? [...new Set(value.filter((x): x is string => typeof x === "string"))].slice(0, 100) : [];
  } catch { return []; }
}
interface FavoritesContextValue { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => void; count: number; ready: boolean }
const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const authKey = useAuthKey();
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const current = useRef<string[]>([]);
  const owner = useRef<string | null>(null);
  const generation = useRef(0);
  const revision = useRef(0);
  const chain = useRef(Promise.resolve());
  const apply = useCallback((value: string[]) => { current.current = value; setIds(value); }, []);

  useEffect(() => {
    const epoch = ++generation.current;
    owner.current = null;
    apply([]);
    setReady(false);
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      const rev = revision.current;
      try {
        const state = await getFavoriteState();
        if (epoch !== generation.current || rev !== revision.current) return;
        owner.current = state.customerId;
        if (!state.customerId) { apply(readGuest()); setReady(true); return; }
        const guest = readGuest();
        if (guest.length) {
          await mergeGuestFavorites(state.customerId, guest);
          if (epoch !== generation.current) return;
          localStorage.removeItem(STORAGE_KEY);
          const fresh = await getFavoriteState();
          if (epoch !== generation.current || rev !== revision.current || fresh.customerId !== state.customerId) return;
          apply(fresh.ids);
        } else apply(state.ids);
        setReady(true);
      } catch { if (epoch === generation.current) toast.error("Не удалось обновить избранное"); }
    };
    void refresh();
    const onFocus = () => { void chain.current.then(refresh); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const timer = setInterval(onFocus, 30_000);
    return () => { ++generation.current; clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [authKey, apply]);

  const toggle = useCallback((id: string) => {
    if (!ready) return;
    const selected = !current.current.includes(id);
    const next = selected ? [...current.current, id] : current.current.filter(x => x !== id);
    apply(next);
    const customerId = owner.current;
    if (!customerId) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
      catch { toast.error("Не удалось сохранить избранное на устройстве"); }
      return;
    }
    const epoch = generation.current;
    const rev = ++revision.current;
    chain.current = chain.current.then(async () => {
      if (epoch !== generation.current) return;
      await setFavorite(customerId, id, selected);
    }).catch(() => { if (epoch === generation.current) toast.error("Не удалось сохранить избранное"); }).then(async () => {
      if (epoch !== generation.current || rev !== revision.current) return;
      try {
        const state = await getFavoriteState();
        if (epoch === generation.current && rev === revision.current && customerId === state.customerId) apply(state.ids);
      } catch { /* The next focus refresh retries the authoritative read. */ }
    });
  }, [ready, apply]);
  const value = useMemo(() => ({ ids, has: (id: string) => ids.includes(id), toggle, count: ids.length, ready }), [ids, toggle, ready]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites должен использоваться внутри FavoritesProvider");
  return value;
}
