/**
 * Тонкая типизированная обёртка над REST API ХАЯТ.
 * Ровно один источник правды по путям и параметрам — экраны сюда не лезут руками.
 */
import { apiFetch, normalizeImageUrl, qs } from "./client";
import { localDay } from "@/lib/format";
import { adaptPage, adaptProduct, adaptSettings } from "./legacy";
import type { CompatibilityEvidence,
  AuthResult, Banner, Category, CompatibilityRule, Consultation, CreateConsultationBody,
  CreateIntakePlanBody, CreateOrderBody, Customer, IntakeLog, IntakePlan, IntakeToggleResult,
  LoginBody, MaterialDetail, MaterialListItem, OkResult, Order, Paged, Product, ProductsQuery,
  RegisterBody, RegisterDeviceBody, SearchResult, SearchSuggestion, Settings, Taxonomy,
  ToggleIntakeLogBody, UpdateProfileBody,
  Address, AddressBody, ChangePasswordBody, IntakeLogRow, UpdateIntakePlanBody,
} from "./types";

/* ── нормализация относительных ссылок на картинки ─────────────────────── */

const fixProduct = (raw: Product): Product => {
  const p = adaptProduct(raw);
  return {
  ...p,
  image: normalizeImageUrl(p.image),
  images: (p.images ?? []).map((i) => ({ ...i, url: normalizeImageUrl(i.url) as string })),
  };
};
const fixCategory = (c: Category): Category => ({ ...c, image: normalizeImageUrl(c.image) });
const fixBanner = (b: Banner): Banner => ({
  ...b,
  image: normalizeImageUrl(b.image),
  imageMobile: normalizeImageUrl(b.imageMobile),
});
const fixMaterial = <T extends MaterialListItem>(m: T): T => ({
  ...m,
  coverImage: normalizeImageUrl(m.coverImage),
});

/* ── Каталог (публично) ──────────────────────────────────────────────────── */

export const catalog = {
  async products(query: ProductsQuery = {}, signal?: AbortSignal): Promise<Paged<Product>> {
    const raw = await apiFetch<unknown>(`/products${qs(query)}`, { auth: false, signal });
    const page = adaptPage(raw, query.take ?? 24, query.skip ?? 0);
    return { ...page, items: page.items.map(fixProduct) };
  },

  /** Восстанавливает гостевое избранное по сохранённым ID, даже без кэша каталога. */
  async productsByIds(productIds: readonly string[], signal?: AbortSignal): Promise<Product[]> {
    const ids = [...new Set(productIds)];
    const found = new Map<string, Product>();
    for (let offset = 0; offset < ids.length; offset += 100) {
      const batch = ids.slice(offset, offset + 100);
      const page = await catalog.products({ ids: batch.join(","), take: 100 }, signal);
      for (const product of page.items) found.set(product.id, product);
    }
    return ids.flatMap((id) => {
      const product = found.get(id);
      return product ? [product] : [];
    });
  },

  async product(slug: string, signal?: AbortSignal): Promise<Product> {
    return fixProduct(await apiFetch<Product>(`/products/${encodeURIComponent(slug)}`, { auth: false, signal }));
  },

  async related(slug: string, take = 8, signal?: AbortSignal): Promise<Product[]> {
    const items = await apiFetch<Product[]>(
      `/products/${encodeURIComponent(slug)}/related${qs({ take })}`, { auth: false, signal },
    );
    return items.map(fixProduct);
  },

  async categories(signal?: AbortSignal): Promise<Category[]> {
    return (await apiFetch<Category[]>("/categories", { auth: false, signal })).map(fixCategory);
  },

  async category(slug: string, signal?: AbortSignal): Promise<Category> {
    return fixCategory(await apiFetch<Category>(`/categories/${encodeURIComponent(slug)}`, { auth: false, signal }));
  },

  taxonomy: (signal?: AbortSignal) =>
    apiFetch<Taxonomy>("/taxonomy", { auth: false, signal }),

  async search(q: string, limit = 48, signal?: AbortSignal): Promise<SearchResult> {
    const r = await apiFetch<SearchResult>(`/search${qs({ q, limit })}`, { auth: false, signal });
    return { ...r, items: r.items.map(fixProduct) };
  },

  suggestions: (q: string, limit = 8, signal?: AbortSignal) =>
    apiFetch<SearchSuggestion[]>(`/search/suggestions${qs({ q, limit })}`, { auth: false, signal }),

  async banners(placement?: Banner["placement"], signal?: AbortSignal): Promise<Banner[]> {
    const items = await apiFetch<Banner[]>(`/banners${qs({ placement })}`, { auth: false, signal });
    return items.map(fixBanner);
  },

  async materials(signal?: AbortSignal): Promise<MaterialListItem[]> {
    const items = await apiFetch<MaterialListItem[]>("/materials", { auth: false, signal });
    return items.map(fixMaterial);
  },

  async material(slug: string, signal?: AbortSignal): Promise<MaterialDetail> {
    return fixMaterial(await apiFetch<MaterialDetail>(`/materials/${encodeURIComponent(slug)}`, { auth: false, signal }));
  },

  async settings(signal?: AbortSignal): Promise<Settings> {
    return adaptSettings(await apiFetch<Settings>("/settings", { auth: false, signal }));
  },

  compatibilityEvidence: (signal?: AbortSignal) => apiFetch<CompatibilityEvidence>("/compatibility/evidence", { auth: false, signal }),

  compatibilityRules: (signal?: AbortSignal) =>
    apiFetch<CompatibilityRule[]>("/compatibility/rules", { auth: false, signal }),

  compatibilityComponents: (signal?: AbortSignal) =>
    apiFetch<string[]>("/compatibility/components", { auth: false, signal }),
};

/* ── Аутентификация ──────────────────────────────────────────────────────── */

export const auth = {
  register: (body: RegisterBody) => apiFetch<AuthResult>("/auth/register", { method: "POST", body, auth: false }),
  login: (body: LoginBody) => apiFetch<AuthResult>("/auth/login", { method: "POST", body, auth: false }),
  me: (signal?: AbortSignal) => apiFetch<Customer>("/auth/me", { signal }),
  updateMe: (body: UpdateProfileBody) => apiFetch<Customer>("/auth/me", { method: "PATCH", body }),
  changePassword: (body: ChangePasswordBody) =>
    apiFetch<OkResult>("/auth/password", { method: "PATCH", body }),
  /** Снимает пуш-токены устройства. Сам JWT сервер не отзывает — клиент обязан стереть его из Keychain. */
  logout: (pushToken?: string) =>
    apiFetch<{ ok: true; revokedDevices: number }>("/auth/logout", { method: "POST", body: { pushToken } }),
  /** Требование App Store 5.1.1(v): удаление аккаунта прямо в приложении. Подтверждается паролем. */
  deleteAccount: (password: string) =>
    apiFetch<OkResult>("/auth/me", { method: "DELETE", body: { password } }),
};

/* ── Избранное ───────────────────────────────────────────────────────────── */

export const favorites = {
  async list(signal?: AbortSignal): Promise<Product[]> {
    return (await apiFetch<Product[]>("/favorites", { signal })).map(fixProduct);
  },
  add: (productId: string) => apiFetch<OkResult>(`/favorites/${encodeURIComponent(productId)}`, { method: "POST" }),
  remove: (productId: string) => apiFetch<OkResult>(`/favorites/${encodeURIComponent(productId)}`, { method: "DELETE" }),
  merge: (productIds: string[]) => apiFetch<OkResult>("/favorites", { method: "POST", body: { productIds } }),
};

/* ── Заказы ──────────────────────────────────────────────────────────────── */

export const orders = {
  /** Токен шлём всегда, когда пользователь вошёл: иначе заказ не привяжется к ЛК. */
  create: (body: CreateOrderBody) => apiFetch<Order>("/orders", { method: "POST", body }),
  list: (params: { take?: number; skip?: number } = {}, signal?: AbortSignal) =>
    apiFetch<Order[]>(`/orders${qs(params)}`, { signal }),
  byNumber: (number: number | string, signal?: AbortSignal) =>
    apiFetch<Order>(`/orders/${encodeURIComponent(String(number))}`, { signal }),
  /** Отмена доступна, пока заказ в статусе NEW или CONFIRMED. */
  cancel: (number: number | string) =>
    apiFetch<Order>(`/orders/${encodeURIComponent(String(number))}/cancel`, { method: "POST" }),
};

/* ── Трекер приёма БАД ───────────────────────────────────────────────────── */

export const intake = {
  /**
   * day — ЛОКАЛЬНАЯ дата клиента. Без неё сервер считает «сегодня» по UTC,
   * и с полуночи до 3 ночи по Москве пользователь видит вчерашние отметки.
   */
  plans: (day: string = localDay(), signal?: AbortSignal) =>
    apiFetch<IntakePlan[]>(`/intake${qs({ day, capabilities: "interval-v1" })}`, { signal }),
  create: (body: CreateIntakePlanBody) => apiFetch<IntakePlan>("/intake", { method: "POST", body }),
  update: (planId: string, body: UpdateIntakePlanBody) =>
    apiFetch<IntakePlan>(`/intake/${encodeURIComponent(planId)}`, { method: "PATCH", body }),
  remove: (planId: string) => apiFetch<OkResult>(`/intake/${encodeURIComponent(planId)}`, { method: "DELETE" }),

  /** Единственный корректный источник отметок: локальные даты, без UTC-сдвига. */
  logs: (planId: string, from: string, to: string, signal?: AbortSignal) =>
    apiFetch<IntakeLog[]>(`/intake/${encodeURIComponent(planId)}/logs${qs({ from, to, capabilities: "interval-v1" })}`, { signal }),

  /** Отметки сразу по всем курсам за период — один запрос вместо N (календарь, стрик). */
  allLogs: (from: string, to: string, signal?: AbortSignal) =>
    apiFetch<IntakeLogRow[]>(`/intake/logs${qs({ from, to, capabilities: "interval-v1" })}`, { signal }),

  /** POST-переключатель: НЕ идемпотентен, вслепую не повторять. */
  toggleLog: (planId: string, body: ToggleIntakeLogBody) =>
    apiFetch<IntakeToggleResult>(`/intake/${encodeURIComponent(planId)}/logs`, { method: "POST", body }),
};

/* ── Консультации и устройства ───────────────────────────────────────────── */

export const addresses = {
  list: (signal?: AbortSignal) => apiFetch<Address[]>("/addresses", { signal }),
  create: (body: AddressBody) => apiFetch<Address>("/addresses", { method: "POST", body }),
  update: (id: string, body: Partial<AddressBody>) =>
    apiFetch<Address>(`/addresses/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  remove: (id: string) => apiFetch<OkResult>(`/addresses/${encodeURIComponent(id)}`, { method: "DELETE" }),
  makeDefault: (id: string) =>
    apiFetch<Address>(`/addresses/${encodeURIComponent(id)}/default`, { method: "POST" }),
};

export const consultations = {
  list: (signal?: AbortSignal) => apiFetch<Consultation[]>("/consultations", { signal }),
  create: (body: CreateConsultationBody) => apiFetch<Consultation>("/consultations", { method: "POST", body }),
};

export const devices = {
  register: (body: RegisterDeviceBody) => apiFetch<OkResult>("/devices", { method: "POST", body }),
  unregister: (pushToken: string) =>
    apiFetch<OkResult>(`/devices/${encodeURIComponent(pushToken)}`, { method: "DELETE" }),
};

export const api = { catalog, auth, favorites, orders, intake, addresses, consultations, devices };
