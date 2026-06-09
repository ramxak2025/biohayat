"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { getFavoriteIds, syncFavorites } from "@/app/actions/favorites";
import { useAuthFlag } from "@/lib/use-auth-flag";

const STORAGE_KEY = "hayat_favorites_v1";

interface FavoritesContextValue {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
  ready: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  // Признак входа — из клиентского cookie-флага hayat_auth (а не из SSR-пропа):
  // layout больше не читает cookies(), и страницы могут отдаваться статически.
  // До гидрации значение false, после монтирования флаг перечитывается, и
  // эффекты ниже отрабатывают флип false→true так же, как раньше смену пропа.
  const loggedIn = useAuthFlag();
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  // Серверный снимок избранного загружен (через getFavoriteIds). До этого
  // sync не выполняем: syncFavorites заменяет набор в БД целиком, и отправка
  // одного только localStorage стёрла бы серверное избранное. Ref, а не state:
  // мердж серверных id меняет ids, и sync-эффект перечитает флаг сам.
  const serverLoaded = useRef(false);
  // Цепочка промисов сериализует запросы синхронизации: без неё два быстрых
  // toggle могли прийти на сервер в обратном порядке, и БД получала бы
  // устаревший снимок (гонка «последний пишет — побеждает не тот»).
  const syncChain = useRef<Promise<void>>(Promise.resolve());
  // Последний успешно подтверждённый сервером снимок — чтобы не слать дубли.
  const lastSynced = useRef<string | null>(null);

  // гидрация из localStorage (один раз при монтировании)
  useEffect(() => {
    let local: string[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(parsed)) local = parsed.filter((x): x is string => typeof x === "string");
    } catch {
      /* ignore */
    }
    setIds((prev) => Array.from(new Set([...prev, ...local])));
    setReady(true);
  }, []);

  // для авторизованных — подтягиваем серверное избранное и мерджим с локальным
  // (порядок: сервер, затем новое локальное — как раньше при SSR-передаче)
  useEffect(() => {
    if (!loggedIn) {
      serverLoaded.current = false;
      lastSynced.current = null;
      return;
    }
    let cancelled = false;
    getFavoriteIds()
      .then((server) => {
        if (cancelled) return;
        serverLoaded.current = true;
        // новый массив → ids меняются по ссылке → sync-эффект сработает
        setIds((prev) => Array.from(new Set([...server, ...prev])));
      })
      .catch(() => {
        // сервер недоступен — работаем на localStorage; sync остаётся выключенным,
        // чтобы не затереть серверное избранное неполным локальным набором
      });
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  // персист в localStorage + синхронизация в БД (для авторизованных)
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    if (!loggedIn || !serverLoaded.current) return;

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
