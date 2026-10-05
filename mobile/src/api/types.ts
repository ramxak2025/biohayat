/* ============================================================================
 *  ХАЯТ REST API v2 — сериализованные типы
 *  Все даты — ISO-8601 строки. Все картинки — абсолютные URL.
 * ========================================================================== */

/* ── 5.1 Конверт ─────────────────────────────────────────────────────────── */

export type ApiErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL"
  | "SESSION_CHANGED"
  | "CART_CHANGED"
  | "PRICE_CHANGED"
  | "RETRY_REQUEST"
  | "CONFLICT";

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiFailure {
  error: {
    message: string;
    /** Отсутствует у ошибок логина/регистрации — ориентируйтесь на HTTP-статус. */
    code?: ApiErrorCode;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Страница каталога. Такую форму отдаёт ТОЛЬКО GET /products. */
export interface Paged<T> {
  items: T[];
  total: number;
  take: number;
  skip: number;
}

/** Ответ мутаций без полезной нагрузки: DELETE /intake/{id}, PUT /favorites и т.д. */
export interface OkResult {
  ok: true;
}

/* ── 5.2 Деньги ──────────────────────────────────────────────────────────── */

export interface Money {
  /** Целое число копеек — единственный источник для арифметики. */
  kopecks: number;
  /** kopecks / 100 — float, только для отладки. */
  rub: number;
  /** Готовая строка ru-RU, напр. "1 300 ₽". Разделитель — U+00A0. */
  formatted: string;
}

/* ── 5.3 Каталог ─────────────────────────────────────────────────────────── */

export interface ProductImage {
  url: string;
  alt: string | null;
}

/** Урезанная категория внутри товара: без id, description и картинки. */
export interface ProductCategoryRef {
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  /** Состав */
  composition: string | null;
  /** Способ применения */
  usage: string | null;
  contraindications: string | null;
  /** Объём/форма выпуска, напр. "60 капсул" */
  volume: string | null;
  sku: string | null;
  price: Money;
  /** null, если старой цены нет ИЛИ она равна 0 */
  oldPrice: Money | null;
  /** null, если oldPrice отсутствует или <= price. Иначе целые проценты. */
  discountPercent: number | null;
  inStock: boolean;
  isFeatured: boolean;
  /** Свободные метки, напр. ["хит", "новинка"] */
  badges: string[];
  /** slug'и из /taxonomy.audiences: "men" | "women" | "kids" */
  audiences: string[];
  /** slug'и из /taxonomy.goals */
  goals: string[];
  /** Имена компонентов для проверки совместимости, напр. ["Кальций","Железо"] */
  nutrients: string[];
  category: ProductCategoryRef | null;
  /**
   * В списках (/products, /search, /favorites, /related) — максимум 1 элемент.
   * В карточке (/products/{slug}) — все, отсортированы по sortOrder.
   */
  images: ProductImage[];
  /** Первая картинка абсолютным URL либо null. */
  image: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Имя иконки lucide-react (строка), напр. "Pill", "ShieldPlus". Не URL. */
  icon: string | null;
  /** Абсолютный URL обложки либо null. */
  image: string | null;
  sortOrder: number;
}

/* ── 5.4 Баннеры ─────────────────────────────────────────────────────────── */

export type BannerPlacement =
  | "HERO"
  | "HOME_STRIP"
  | "CATEGORY"
  | "SIDEBAR"
  | "POPUP";

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  imageMobile: string | null;
  ctaLabel: string | null;
  /** Ссылка в терминах ВЕБ-роутов ("/sale", "/category/immunitet"). Мапить вручную. */
  link: string | null;
  placement: BannerPlacement;
  /** HEX-цвет подложки, напр. "#0F766E". */
  bgColor: string | null;
}

/* ── 5.5 Материалы ───────────────────────────────────────────────────────── */

export interface MaterialListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  /** ISO-дата или null (материал опубликован, но дата не проставлена). */
  publishedAt: string | null;
}

export interface MaterialDetail extends MaterialListItem {
  /** HTML/Markdown из админки. Санитизировать перед рендером. */
  content: string;
}

/* ── 5.6 Заказы ──────────────────────────────────────────────────────────── */

export type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "PAID"
  | "ASSEMBLING"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderTracking {
  number: string;
  /** "cdek" | "pochta" | произвольная строка | null */
  carrier: string | null;
  /** Готовая ссылка на сайт перевозчика (дефолт — СДЭК). */
  url: string;
}

export interface OrderItem {
  /** Снимок названия на момент заказа. productId/slug/картинки НЕ отдаются. */
  name: string;
  qty: number;
  price: Money;
  /** price.kopecks * qty, посчитано сервером. */
  lineTotal: Money;
}

export interface Order {
  id: string;
  /** Человекочитаемый номер (autoincrement). Именно он идёт в /orders/{number}. */
  number: number;
  status: OrderStatus;
  /** Русская подпись статуса, уже готова к показу. */
  statusLabel: string;
  total: Money;
  customerName: string;
  phone: string;
  address: string | null;
  comment: string | null;
  createdAt: string;
  tracking: OrderTracking | null;
  items: OrderItem[];
}

/** Клиентская константа — порядок статусов для прогресс-бара (src/lib/order-status.ts). */
export const ORDER_FLOW: OrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "PAID",
  "ASSEMBLING",
  "SHIPPED",
  "IN_TRANSIT",
  "DELIVERED",
];

/** Подписи (сервер уже присылает statusLabel, но для оффлайна полезно). */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новая",
  CONFIRMED: "Подтверждена",
  PAID: "Оплачена",
  ASSEMBLING: "На сборке",
  SHIPPED: "Передана в доставку",
  IN_TRANSIT: "В пути",
  DELIVERED: "Доставлена",
  CANCELLED: "Отменена",
};

/* ── 5.7 Трекер приёма ───────────────────────────────────────────────────── */

export interface IntakeLog {
  /** "YYYY-MM-DD" */
  day: string;
  /** Совпадает с элементом IntakePlan.times, формат "HH:MM". */
  slot: string;
  /** ISO-дата фактической отметки. */
  takenAt: string;
}

export interface IntakePlan {
  id: string;
  title: string;
  /** cuid товара из каталога либо null (произвольный курс). */
  productId: string | null;
  /** Времена приёма, "HH:MM". Сервер формат НЕ валидирует. */
  times: string[];
  /** ISO-дата старта, проставляется сервером при создании. */
  startDate: string;
  /** null = бессрочно */
  durationDays: number | null;
  note: string | null;
  isActive: boolean;
  /**
   * В GET /intake, POST /intake и PATCH /intake/{id} — ТОЛЬКО за «сегодня»
   * по UTC-дате сервера. Не использовать для календаря, см. риск R-2.
   */
  logs: IntakeLog[];
}

/** Ответ POST /intake/{planId}/logs */
export interface IntakeToggleResult {
  /** true — отметка поставлена, false — снята. */
  taken: boolean;
  day: string;
  slot: string;
}

/* ── 5.8 Совместимость ───────────────────────────────────────────────────── */

export type CompatibilityType = "SYNERGY" | "ANTAGONIST" | "CAUTION";

export interface CompatibilityRule {
  id: string;
  /** Имя компонента, напр. "Кальций" — совпадает со значениями Product.nutrients. */
  componentA: string;
  componentB: string;
  type: CompatibilityType;
  note: string | null;
}

/* ── 5.9 Покупатель ──────────────────────────────────────────────────────── */

export interface Customer {
  id: string;
  name: string;
  /** Нормализованный "+7XXXXXXXXXX". */
  phone: string;
  email: string | null;
  city: string | null;
  /** Бонусные баллы. API их НЕ начисляет и НЕ списывает — только показывает. */
  bonusBalance: number;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  /** 2592000 (30 дней) */
  expiresInSec: number;
  customer: Customer;
}

export type ConsultationStatus = "NEW" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export interface Consultation {
  id: string;
  name: string;
  phone: string;
  topic: string | null;
  message: string | null;
  status: ConsultationStatus;
  createdAt: string;
}

/* ── 5.10 Настройки ──────────────────────────────────────────────────────── */

export interface Settings {
  siteName: string;
  phone: string;
  email: string;
  address: string;
  workingHours: string;
  socials: {
    instagram: string | null;
    telegram: string | null;
    whatsapp: string | null;
    vk: string | null;
    wildberries: string | null;
  };
  legal: {
    name: string | null;
    inn: string | null;
    ogrn: string | null;
    address: string | null;
  };
  /** Порог бесплатной доставки. Дефолт 2 000 000 коп = 20 000 ₽. */
  freeDeliveryThreshold: Money;
  /** Обязательная плашка про БАД — показывать в каталоге и карточке. */
  badDisclaimer: string;
}

/* ── 5.11 Таксономия ─────────────────────────────────────────────────────── */

export interface TaxonomyItem {
  slug: string;
  name: string;
  /** Имя иконки lucide-react строкой, напр. "Mars". Может быть null. */
  icon: string | null;
}

export interface Taxonomy {
  audiences: TaxonomyItem[]; // men / women / kids
  goals: TaxonomyItem[];     // immunity, weight-loss, sport, energy, beauty,
                             // joints, calm, digestion, heart
}

/* ── 5.12 Поиск ──────────────────────────────────────────────────────────── */

export interface SearchResult {
  items: Product[];
  /** ВНИМАНИЕ: = items.length, обрезано по limit. Не общее число совпадений. */
  total: number;
  /** Обрезанный пробелами запрос, который реально применился. */
  query: string;
}

export interface SearchSuggestion {
  slug: string;
  name: string;
}

/* ── 5.13 Тела запросов ──────────────────────────────────────────────────── */

export interface RegisterBody {
  name: string;      // >= 2
  phone: string;     // лучше уже "+7XXXXXXXXXX"
  password: string;  // >= 6
  email?: string;    // валидный email
  consent: true;     // ровно true
}

export interface LoginBody {
  phone: string;
  password: string;
}

export interface UpdateProfileBody {
  name?: string;   // >= 2
  email?: string;  // email | ""
  city?: string;   // <= 120 | ""
}

export interface CreateOrderBody {
  requestKey: string;
  expectedTotalKopecks: number;
  customerName: string;                      // 2..120
  phone: string;                             // >= 10 симв., /[\d+()\-\s]{10,}/
  email?: string;                            // email | ""
  address?: string;                          // <= 500 | ""
  comment?: string;                          // <= 1000 | ""
  consent: true;
  items: Array<{ id: string; qty: number }>; // >= 1, qty int 1..99
}

export interface CreateIntakePlanBody {
  productId?: string;
  title?: string;        // 1..200; обязателен, если productId не дал названия
  times: string[];       // >= 1, формат "HH:MM" (договорённость, не проверяется)
  durationDays?: number; // int 1..3650
  note?: string;         // <= 1000
}

export interface ToggleIntakeLogBody {
  day: string;  // строго "YYYY-MM-DD"
  slot: string; // непустая строка, обычно элемент plan.times
}

export interface CreateConsultationBody {
  topic?: string;   // <= 200
  message: string;  // 1..2000
  name?: string;    // <= 120
  phone?: string;   // <= 40
}

export interface RegisterDeviceBody {
  platform: "ios" | "android";
  pushToken: string;
  appVersion?: string; // <= 64
}

export interface ReplaceFavoritesBody {
  productIds: string[];
}

/** Сортировка каталога. Неизвестное значение сервер трактует как "popular". */
export type ProductSort = "popular" | "price_asc" | "price_desc" | "discount" | "new";

export interface ProductsQuery {
  /** Список ID через запятую; публичные активные товары из общей базы сайта. */
  ids?: string;
  category?: string;
  audience?: string;
  goal?: string;
  /** Передавать строкой "true"; любое другое значение выключает фильтр. */
  featured?: "true";
  onSale?: "true";
  q?: string;
  take?: number; // 1..100, дефолт 24
  skip?: number; // >= 0, дефолт 0
  sort?: ProductSort;
  /** Копейки, включительно. Целое ≥ 0, иначе сервер отвечает VALIDATION. */
  priceFrom?: number;
  priceTo?: number;
  /** Передавать строкой "true"; любое другое значение выключает фильтр. */
  inStock?: "true";
}

/* ── 5.14 Справочник таксономии (зашит в код сервера, src/lib/taxonomy.ts) ── */

/** Ось «кому» — значения Product.audiences. */
export const AUDIENCES = [
  { slug: "men", name: "Мужчинам", icon: "Mars" },
  { slug: "women", name: "Женщинам", icon: "Venus" },
  { slug: "kids", name: "Детям", icon: "Baby" },
] as const;

/** Ось «зачем» — значения Product.goals. */
export const GOALS = [
  { slug: "immunity", name: "Иммунитет", icon: "ShieldPlus" },
  { slug: "weight-loss", name: "Похудение", icon: "Flame" },
  { slug: "sport", name: "Спорт и масса", icon: "Dumbbell" },
  { slug: "energy", name: "Энергия и тонус", icon: "Zap" },
  { slug: "beauty", name: "Красота и кожа", icon: "Sparkles" },
  { slug: "joints", name: "Суставы", icon: "Bone" },
  { slug: "calm", name: "Сон и нервы", icon: "Moon" },
  { slug: "digestion", name: "Пищеварение", icon: "Soup" },
  { slug: "heart", name: "Сердце и сосуды", icon: "HeartPulse" },
] as const;

export type AudienceSlug = (typeof AUDIENCES)[number]["slug"];
export type GoalSlug = (typeof GOALS)[number]["slug"];

/* ── Адресная книга (добавлена в API 2026-09-18) ─────────────────────────── */

export interface Address {
  id: string;
  label: string | null;
  recipient: string | null;
  phone: string | null;
  city: string;
  street: string;
  house: string | null;
  apartment: string | null;
  comment: string | null;
  isDefault: boolean;
}

export interface AddressBody {
  label?: string;
  recipient?: string;
  phone?: string;
  city: string;
  street: string;
  house?: string;
  apartment?: string;
  comment?: string;
  isDefault?: boolean;
}

/** PATCH /intake/{id} теперь принимает полный набор полей, а не только isActive. */
export interface UpdateIntakePlanBody {
  isActive?: boolean;
  title?: string;
  /** Строго "HH:MM"; сервер дедуплицирует и сортирует. Максимум 24 значения. */
  times?: string[];
  durationDays?: number | null;
  note?: string;
}

/** Строка из GET /intake/logs — отметки сразу по всем курсам. */
export interface IntakeLogRow extends IntakeLog {
  planId: string;
}

export interface ChangePasswordBody {
  oldPassword: string;
  newPassword: string;
}
