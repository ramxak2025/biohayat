import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { api } from "@/api/endpoints";
import { API_BASE } from "@/api/config";
import { ApiError, setAuthExpiredHandler, setTokenGetter } from "@/api/client";
import type { Customer, LoginBody, RegisterBody } from "@/api/types";
import { advanceSession, sessionGeneration, setSessionOwner } from "@/lib/session-generation";
import { clearPrivateQueries, removeLegacyPrivateCache } from "@/lib/query-client";

// One atomic secure record per backend. Development accounts cannot enter production.
const SESSION_KEY = `hayat.session.v2.${Array.from(API_BASE).map(c => c.charCodeAt(0).toString(16).padStart(4, "0")).join("")}`;
let storageChain = Promise.resolve();
function writeSession(epoch: number, token: string | null, customer: Customer | null) {
  const work = storageChain.catch(() => undefined).then(async () => {
    if (epoch !== sessionGeneration()) return;
    if (token && customer) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token, customer }));
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  });
  storageChain = work;
  return work;
}
interface AuthState {
  token: string | null;
  customer: Customer | null;
  hydrating: boolean;
  hydrate: () => Promise<void>;
  login: (body: LoginBody) => Promise<Customer>;
  register: (body: RegisterBody) => Promise<Customer>;
  logout: () => Promise<void>;
  setCustomer: (customer: Customer) => void;
  refreshProfile: () => Promise<void>;
}
let hydratePromise: Promise<void> | undefined;
export const useAuth = create<AuthState>((set, get) => {
  const begin = () => {
    const epoch = advanceSession();
    clearPrivateQueries();
    set({ token: null, customer: null, hydrating: false });
    return epoch;
  };
  const authenticate = async (request: () => ReturnType<typeof api.auth.login>) => {
    const epoch = begin();
    await writeSession(epoch, null, null);
    const result = await request();
    if (epoch !== sessionGeneration()) throw new ApiError(409, "Сессия изменилась", "SESSION_CHANGED");
    await writeSession(epoch, result.token, result.customer);
    if (epoch !== sessionGeneration()) throw new ApiError(409, "Сессия изменилась", "SESSION_CHANGED");
    setSessionOwner(result.customer.id);
    set({ token: result.token, customer: result.customer });
    return result.customer;
  };
  return {
    token: null, customer: null, hydrating: true,
    hydrate() {
      if (hydratePromise) return hydratePromise;
      const epoch = sessionGeneration();
      hydratePromise = (async () => {
        try {
          await removeLegacyPrivateCache();
          await Promise.all([SecureStore.deleteItemAsync("hayat.session.token"), SecureStore.deleteItemAsync("hayat.session.customer")]);
          const raw = await SecureStore.getItemAsync(SESSION_KEY);
          if (epoch !== sessionGeneration()) return;
          const saved = raw ? JSON.parse(raw) : null;
          if (typeof saved?.token === "string" && typeof saved?.customer?.id === "string") {
            clearPrivateQueries();
            setSessionOwner(saved.customer.id);
            set({ token: saved.token, customer: saved.customer, hydrating: false });
            void get().refreshProfile();
          } else begin();
        } catch { if (epoch === sessionGeneration()) begin(); }
      })();
      return hydratePromise;
    },
    login: body => authenticate(() => api.auth.login(body)),
    register: body => authenticate(() => api.auth.register(body)),
    async logout() {
      const epoch = begin();
      await writeSession(epoch, null, null);
      await removeLegacyPrivateCache();
    },
    setCustomer(customer) {
      const { token, customer: current } = get();
      if (!token || current?.id !== customer.id) return;
      set({ customer });
      void writeSession(sessionGeneration(), token, customer).catch(() => console.warn("Не удалось сохранить кэш профиля"));
    },
    async refreshProfile() {
      const epoch = sessionGeneration();
      if (!get().token) return;
      try {
        const customer = await api.auth.me();
        if (epoch === sessionGeneration()) get().setCustomer(customer);
      } catch { /* API client handles 401; offline refresh preserves this account's profile. */ }
    },
  };
});
setTokenGetter(() => useAuth.getState().token);
setAuthExpiredHandler(token => {
  if (useAuth.getState().token === token) void useAuth.getState().logout().catch(() => console.warn("Не удалось очистить сохранённую сессию"));
});
export const useIsAuthenticated = () => useAuth(s => !!s.token);
