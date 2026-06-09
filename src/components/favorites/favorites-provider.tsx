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
  // Цепочка промисов сериализует запросы синхронизации: без неё два быстрых
  // toggle могли прийти на сервер в обратном порядке, и БД получала бы
  // устаревший снимок (гонка «последний пишет — побеждает не тот»).
  const syncChain = useRef<Promise<void>>(Promise.resolve());
  // Последний успешно подтверждённый сервером снимок — чтобы не слать дубли.
  const lastSynced = useRef<string | null>(null);

  // гидрация из localStorage; для авторизованных — объединяем с серверными
  useEffect(() => {
    let local: string[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(parsed)) local = parsed.filter((x): x is string => typeof x === "string");
    } catch {
      /* ignore */
    }
    if (loggedIn) {
      // мердж: серверное избранное + локальное гостевое (порядок: сервер, затем новое локальное)
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
    if (!loggedIn) return;

    const snapshot = [...ids];
    const key = JSON.stringify([...snapshot].sort());
    if (lastSynced.current === key) return; // этот набор уже подтверждён сервером

    syncChain.current = syncChain.current
      .then(async () => {
        const confirmed = await syncFavorites(snapshot);
        lastSynced.current = key;
        if (!confirmed) return;
        // Сервер мог отбросить id несуществующих товаров — убираем их и у себя,
        // не трогая id, добавленные пользователем уже после отправки снимка.
        const sent = new Set(snapshot);
        const allowed = new Set(confirmed);
        setIds((prev) => {
          const next = prev.filter((id) => !sent.has(id) || allowed.has(id));
          return next.length === prev.length ? prev : next;
        });
      })
      .catch(() => {
        // сеть/сервер недоступны — снимок не подтверждён, повторим при следующем изменении
        lastSynced.current = null;
      });
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
