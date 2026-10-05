import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "hayat.search.history";

/** Сколько запросов помним: дальше история превращается в архив, который никто не читает. */
export const HISTORY_LIMIT = 10;

function parse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, HISTORY_LIMIT);
  } catch {
    // Испорченное хранилище не должно ронять экран поиска — просто начинаем с чистого листа.
    return [];
  }
}

export interface SearchHistory {
  items: string[];
  /** Чтение с диска завершено — до этого историю не рисуем, иначе она мигает. */
  ready: boolean;
  remember: (query: string) => void;
  forget: (query: string) => void;
  clear: () => void;
}

/** Последние запросы пользователя в AsyncStorage. Хранится только текст запроса. */
export function useSearchHistory(): SearchHistory {
  const [items, setItems] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (alive) setItems(parse(raw));
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setReady(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: string[]) => {
    setItems(next);
    // Пишем в фоне: экран поиска не должен ждать диск.
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const remember = useCallback(
    (query: string) => {
      const value = query.trim();
      if (value.length < 2) return;
      const rest = items.filter((item) => item.toLowerCase() !== value.toLowerCase());
      persist([value, ...rest].slice(0, HISTORY_LIMIT));
    },
    [items, persist],
  );

  const forget = useCallback(
    (query: string) => {
      persist(items.filter((item) => item !== query));
    },
    [items, persist],
  );

  const clear = useCallback(() => {
    setItems([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }, []);

  return { items, ready, remember, forget, clear };
}
