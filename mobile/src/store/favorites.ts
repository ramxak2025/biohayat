import { API_BASE } from "@/api/config";
/**
 * Избранное. У гостя живёт локально, после входа — синхронизируется на сервер
 * (POST /favorites добавляет гостевые товары), дальше сервер — источник истины.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface GuestFavoritesState {
  ids: string[];
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
}

export const useGuestFavorites = create<GuestFavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) =>
        set((s) => ({
          ids: s.ids.includes(productId)
            ? s.ids.filter((x) => x !== productId)
            : [...s.ids, productId],
        })),
      has: (productId) => get().ids.includes(productId),
      clear: () => set({ ids: [] }),
    }),
    { name: `hayat.favorites.guest.v2:${API_BASE}`, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
