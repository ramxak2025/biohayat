"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

/**
 * Оптовая корзина (заявка). Хранит ТОЛЬКО {productId, qty} в localStorage —
 * названия, цены и лесенки приходят с сервера на каждой странице кабинета
 * (цены видны только одобренным аккаунтам и не должны кешироваться в браузере).
 */

export interface B2BCartItem {
  productId: string;
  qty: number;
}

interface B2BCartState {
  items: B2BCartItem[];
}

type Action =
  | { type: "SET_QTY"; productId: string; qty: number }
  | { type: "REMOVE"; productId: string }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; state: B2BCartState };

const STORAGE_KEY = "hayat_b2b_cart";

function sanitize(state: unknown): B2BCartState {
  if (!state || typeof state !== "object") return { items: [] };
  const raw = (state as B2BCartState).items;
  if (!Array.isArray(raw)) return { items: [] };
  const items: B2BCartItem[] = [];
  for (const it of raw) {
    if (!it || typeof it.productId !== "string") continue;
    const qty = Math.floor(Number(it.qty));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    if (items.some((x) => x.productId === it.productId)) continue;
    items.push({ productId: it.productId, qty: Math.min(qty, 10000) });
  }
  return { items };
}

function reducer(state: B2BCartState, action: Action): B2BCartState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "SET_QTY": {
      const qty = Math.min(Math.max(Math.floor(action.qty), 0), 10000);
      if (qty <= 0) {
        return { items: state.items.filter((i) => i.productId !== action.productId) };
      }
      const exists = state.items.some((i) => i.productId === action.productId);
      if (!exists) return { items: [...state.items, { productId: action.productId, qty }] };
      return {
        items: state.items.map((i) => (i.productId === action.productId ? { ...i, qty } : i)),
      };
    }
    case "REMOVE":
      return { items: state.items.filter((i) => i.productId !== action.productId) };
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

interface B2BCartContextValue {
  items: B2BCartItem[];
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /** Суммарное количество штук во всех позициях. */
  count: number;
  /** localStorage прочитан — можно показывать значения без мигания. */
  ready: boolean;
}

const B2BCartContext = createContext<B2BCartContextValue | null>(null);

export function B2BCartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", state: sanitize(JSON.parse(raw)) });
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const value = useMemo<B2BCartContextValue>(() => {
    const count = state.items.reduce((s, i) => s + i.qty, 0);
    return {
      items: state.items,
      setQty: (productId, qty) => dispatch({ type: "SET_QTY", productId, qty }),
      remove: (productId) => dispatch({ type: "REMOVE", productId }),
      clear: () => dispatch({ type: "CLEAR" }),
      count,
      ready,
    };
  }, [state, ready]);

  return <B2BCartContext.Provider value={value}>{children}</B2BCartContext.Provider>;
}

export function useB2BCart() {
  const ctx = useContext(B2BCartContext);
  if (!ctx) throw new Error("useB2BCart должен использоваться внутри B2BCartProvider");
  return ctx;
}
