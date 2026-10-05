import { API_BASE } from "@/api/config";
/**
 * Корзина — только на устройстве: серверного эндпоинта корзины нет, а цены при
 * оформлении заказа всё равно пересчитываются на сервере по БД.
 * Храним снимок товара целиком: API не умеет отдавать товары пачкой по id.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Product } from "@/api/types";

export interface CartLine {
  id: string;
  slug: string;
  name: string;
  /** Копейки на момент добавления — на чекауте сверяемся с сервером. */
  priceKopecks: number;
  /**
   * Старая цена на момент добавления, если товар был со скидкой. Нужна корзине,
   * чтобы показать перечёркнутую цену и строку «Скидка» — без снимка пришлось бы
   * ходить за товаром заново по каждой позиции (эндпоинта «товары пачкой» нет).
   */
  oldPriceKopecks?: number;
  image: string | null;
  volume: string | null;
  qty: number;
  available?: boolean;
}

interface CartState {
  lines: CartLine[];
  refreshProducts: (products: Product[]) => void;
  consume: (ordered: { id: string; qty: number }[]) => void;
  add: (product: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  /** Вернуть удалённую позицию на её место — для «Отменить» после свайпа. */
  restore: (line: CartLine, index: number) => void;
  clear: () => void;
}

const MAX_QTY = 99;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      refreshProducts: (products) => set(state => ({ lines: state.lines.map(line => {
        const product = products.find(p => p.id === line.id);
        return product ? { ...line, name: product.name, slug: product.slug, image: product.image, volume: product.volume,
          priceKopecks: product.price.kopecks, oldPriceKopecks: product.oldPrice?.kopecks, available: product.inStock } : { ...line, available: false };
      }) })),
      consume: (ordered) => set(state => ({ lines: state.lines.flatMap(line => {
        const qty = line.qty - (ordered.find(item => item.id === line.id)?.qty ?? 0);
        return qty > 0 ? [{ ...line, qty }] : [];
      }) })),

      add: (product, qty = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.id === product.id);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.id === product.id ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l,
              ),
            };
          }
          return {
            lines: [
              ...s.lines,
              {
                id: product.id,
                slug: product.slug,
                name: product.name,
                priceKopecks: product.price.kopecks,
                ...(product.oldPrice ? { oldPriceKopecks: product.oldPrice.kopecks } : {}),
                image: product.image,
                volume: product.volume,
                qty: Math.min(MAX_QTY, qty),
              },
            ],
          };
        }),

      setQty: (id, qty) =>
        set((s) => ({
          lines:
            qty <= 0
              ? s.lines.filter((l) => l.id !== id)
              : s.lines.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
        })),

      remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),

      restore: (line, index) =>
        set((s) => {
          if (s.lines.some((l) => l.id === line.id)) return s;
          const lines = [...s.lines];
          lines.splice(Math.max(0, Math.min(index, lines.length)), 0, line);
          return { lines };
        }),
      clear: () => set({ lines: [] }),
    }),
    { name: `hayat.cart.v2:${API_BASE}`, storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartTotalKopecks = (lines: CartLine[]) =>
  lines.reduce((sum, l) => sum + l.priceKopecks * l.qty, 0);

/** Счётчик для бейджа таб-бара. */
export const useCartCount = () => useCart((s) => cartCount(s.lines));
