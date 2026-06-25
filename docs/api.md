# REST API v1 (headless)

Общий бэкенд для сайта и **мобильного приложения на React Native**. Все ответы — JSON.

- Базовый префикс: `/api/v1`
- Версионирование — в пути (`v1`). Ломающие изменения → `v2`.
- CORS открыт (заголовки на каждом маршруте), preflight `OPTIONS` поддержан.
- Авторизация покупателя — **Bearer-токен** (`Authorization: Bearer <jwt>`), 30 дней.
  Тот же токен совместим с web-cookie сессией.

## Конверт ответа

```jsonc
// успех
{ "data": <payload> }
// список с пагинацией
{ "data": { "items": [...], "total": 120, "take": 24, "skip": 0 } }
// ошибка
{ "error": { "message": "Текст", "code": "VALIDATION|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|INTERNAL" } }
```

Цены везде: `{ "kopecks": 130000, "rub": 1300, "formatted": "1 300 ₽" }`.
Изображения — абсолютные URL.

## Аутентификация

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| POST | `/auth/register` | público | `{name,phone,password,email?,consent:true}` → `{token, expiresInSec, customer}` |
| POST | `/auth/login` | público | `{phone,password}` → `{token, expiresInSec, customer}` |
| GET | `/auth/me` | bearer | текущий профиль |
| PATCH | `/auth/me` | bearer | `{name?,email?,city?}` |

## Каталог (публично)

| Метод | Путь | Параметры |
|---|---|---|
| GET | `/products` | `category, audience, goal, featured, onSale, q, take, skip` |
| GET | `/products/{slug}` | карточка товара |
| GET | `/products/{slug}/related` | `take` |
| GET | `/categories` | дерево навигации |
| GET | `/categories/{slug}` | категория |
| GET | `/taxonomy` | `{ audiences, goals }` (оси «кому/зачем») |
| GET | `/search` | `q, limit` — нечёткий поиск (опечатки) |
| GET | `/search/suggestions` | `q, limit` — живые подсказки |
| GET | `/banners` | `placement=HERO\|HOME_STRIP\|...` |
| GET | `/materials` / `/materials/{slug}` | статьи |
| GET | `/settings` | публичные настройки (контакты, дисклеймер, порог доставки) |
| GET | `/compatibility/rules` | правила совместимости БАД |
| GET | `/compatibility/components` | список компонентов |

## Покупатель (bearer)

| Метод | Путь | Назначение |
|---|---|---|
| GET/PUT | `/favorites` | список / заменить набор `{productIds}` |
| POST/DELETE | `/favorites/{productId}` | добавить / убрать |
| POST | `/orders` | оформить заказ `{customerName,phone,...,items:[{id,qty}]}` (цена пересчитывается по БД) |
| GET | `/orders` | мои заказы (пагинация) |
| GET | `/orders/{number}` | заказ (только владелец) |
| GET/POST | `/intake` | курсы приёма БАД / создать |
| PATCH/DELETE | `/intake/{planId}` | активность / удалить |
| GET/POST | `/intake/{planId}/logs` | отметки приёма (`{day,slot}` — тоггл) |
| GET/POST | `/consultations` | заявки на консультацию нутрициолога |
| POST | `/devices` | регистрация push-токена `{platform,pushToken,appVersion?}` |
| DELETE | `/devices/{pushToken}` | отписать устройство |

## Пример (React Native / fetch)

```ts
const API = "https://biohayat.ru/api/v1";

// логин
const r = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone, password }),
});
const { data } = await r.json();           // { token, customer }
// сохранить data.token в SecureStore

// мои заказы
const orders = await fetch(`${API}/orders`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((x) => x.json());
```

## Рекомендации по развитию (для prod-уровня)
- Refresh-токены с ротацией + серверный отзыв (модель `RefreshToken`) — сейчас единый
  30-дневный access-токен (достаточно для MVP).
- Rate-limit на `/auth/*`, `POST /orders`, `POST /consultations`.
- Push-уведомления через сохранённые `Device.pushToken` (Expo/FCM/APNs) — напоминания
  о приёме БАД и статусы заказов.
