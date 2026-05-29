"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { syncFavorites } from "@/app/actions/favorites";

const STORAGE_KEY = "hayat_favorites_v1";

interface FavoritesContextValue {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
  ready: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({
  children,
  loggedIn,
  initialIds,
}: {
  children: React.ReactNode;
  loggedIn: boolean;
  initialIds?: string[];
}) {
  const [ids, setIds] = useState<string[]>(initialIds ?? []);
  const [ready, setReady] = useState(false);
  const firstSync = useRef(true);

  // гидрация из localStorage; для авторизованных — объединяем с серверными
  useEffect(() => {
    let local: string[] = [];
    try {
      local = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      /* ignore */
    }
    if (loggedIn) {
      const merged = Array.from(new Set([...(initialIds ?? []), ...local]));
      setIds(merged);
    } else {
      setIds(local);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // персист в localStorage + синхронизация в БД (для авторизованных)
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    if (loggedIn) {
      // первый прогон тоже синхронизируем (мердж локального и серверного)
      firstSync.current = false;
      void syncFavorites(ids);
    }
  }, [ids, ready, loggedIn]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({ ids, has: (id) => ids.includes(id), toggle, count: ids.length, ready }),
    [ids, toggle, ready],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites должен использоваться внутри FavoritesProvider");
  return ctx;
}
