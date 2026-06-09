# Публичный REST API v1 — магазин БАД «ХАЯТ»

Фундамент для мобильного приложения (React Native). Все примеры — `curl`.

## Базовые сведения

- **Base URL:** `https://biohayat.ru/api/v1` (локально — `http://localhost:3000/api/v1`)
- **Формат:** JSON, `Content-Type: application/json` (запросы и ответы, UTF-8)
- **Деньги:** все суммы — в **копейках** (`Int`). `130000` = 1 300 ₽. Деление на 100 — только на стороне отображения.
- **Даты:** ISO 8601 (`2026-06-09T12:34:56.000Z`).

### Единый формат ответа

Успех:

```json
{ "ok": true, "data": { /* ... */ }, "meta": { /* опционально: пагинация и т.п. */ } }
```

Ошибка:

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Понятное описание на русском" } }
```

### Коды ошибок

| HTTP | `error.code`          | Когда возникает                                                |
| ---- | --------------------- | -------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`    | Невалидные параметры запроса или тело (zod)                     |
| 400  | `PRODUCT_NOT_FOUND`   | В заказе указан несуществующий/неактивный товар                 |
| 401  | `UNAUTHORIZED`        | Нет/просрочен/невалиден Bearer-токен; аккаунт удалён/заблокирован |
| 401  | `INVALID_CREDENTIALS` | Неверный телефон или пароль при входе                           |
| 404  | `NOT_FOUND`           | Ресурс не найден (например, товар по slug)                      |
| 409  | `PHONE_TAKEN`         | Телефон уже зарегистрирован                                     |
| 429  | `RATE_LIMITED`        | Превышен лимит запросов (см. заголовок `Retry-After`, секунды)  |
| 500  | `INTERNAL_ERROR`      | Внутренняя ошибка сервера                                       |

---

## Аутентификация

JWT Bearer. Токен выдаётся при регистрации/входе, подписан HS256 (`AUTH_SECRET`), срок жизни — **30 дней**. Payload совместим с customer-сессией сайта: `{ sub, phone, name }`.

Авторизованные запросы:

```
Authorization: Bearer <token>
```

Флоу:

1. `POST /auth/register` или `POST /auth/login` → получаем `{ token, customer }`.
2. Сохраняем `token` на устройстве.
3. Передаём его в `Authorization` для `/account/*`; в `POST /orders` — опционально (привязка заказа к аккаунту).
4. При ответе `401 UNAUTHORIZED` — токен истёк или аккаунт деактивирован: чистим хранилище и отправляем пользователя на экран входа. Refresh-токенов нет — повторный вход по телефону и паролю.

Телефон нормализуется к виду `+7XXXXXXXXXX` (можно отправлять `8 928 123-45-67`, `+7 (928) 123-45-67` и т.п.).

---

## Эндпоинты

### GET /products — каталог

Параметры query:

| Параметр   | Тип / значения                                  | По умолчанию | Описание                                  |
| ---------- | ----------------------------------------------- | ------------ | ------------------------------------------ |
| `category` | string (slug категории)                         | —            | Фильтр по категории                        |
| `audience` | string (`men` \| `women` \| `kids`)             | —            | Кому                                       |
| `goal`     | string (напр. `immunity`, `weight-loss`)        | —            | Цель                                       |
| `q`        | string ≤ 100 символов                           | —            | Умный поиск (pg_trgm, терпим к опечаткам)  |
| `sort`     | `price_asc` \| `price_desc` \| `new` \| `popular` | `popular` (с `q` — релевантность) | Сортировка |
| `page`     | int ≥ 1                                         | 1            | Страница                                   |
| `perPage`  | int 1..100                                      | 24           | Размер страницы                            |

```bash
curl "https://biohayat.ru/api/v1/products?category=vitaminy&sort=price_asc&page=1&perPage=24"
```

Ответ `200`:

```json
{
  "ok": true,
  "data": [
    {
      "id": "cml1...",
      "slug": "kollagen-morskoy",
      "name": "Коллаген морской",
      "shortDescription": "Пептиды коллагена с витамином C",
      "priceKopecks": 130000,
      "oldPriceKopecks": 150000,
      "image": "/uploads/products/kollagen.webp",
      "badges": ["хит"],
      "inStock": true,
      "volume": "60 капсул"
    }
  ],
  "meta": { "page": 1, "perPage": 24, "total": 87 }
}
```

### GET /products/{slug} — карточка товара

```bash
curl "https://biohayat.ru/api/v1/products/kollagen-morskoy"
```

Ответ `200` — полная карточка: описание, `composition` (состав), `usage` (способ применения), `contraindications` (противопоказания), `volume`, `sku`, `audiences`, `goals`, `nutrients`, все изображения, категория, похожие товары и одобренные отзывы:

```json
{
  "ok": true,
  "data": {
    "id": "cml1...",
    "slug": "kollagen-morskoy",
    "name": "Коллаген морской",
    "shortDescription": "...",
    "description": "...",
    "composition": "Пептиды коллагена, витамин C...",
    "usage": "По 2 капсулы утром во время еды...",
    "contraindications": "Индивидуальная непереносимость, беременность...",
    "volume": "60 капсул",
    "sku": "HYT-001",
    "priceKopecks": 130000,
    "oldPriceKopecks": 150000,
    "badges": ["хит"],
    "audiences": ["women"],
    "goals": ["beauty"],
    "nutrients": ["Коллаген", "Витамин C"],
    "inStock": true,
    "category": { "id": "...", "slug": "krasota", "name": "Красота" },
    "images": [{ "url": "/uploads/products/kollagen.webp", "alt": "Коллаген морской" }],
    "related": [ /* карточки как в GET /products */ ],
    "reviews": [
      { "authorName": "Мадина", "rating": 5, "content": "Отличный продукт", "createdAt": "2026-05-01T10:00:00.000Z" }
    ],
    "rating": { "average": 4.8, "count": 12 }
  }
}
```

`404 NOT_FOUND` — товар не существует или снят с публикации.

### GET /categories — дерево категорий

Активные корневые категории с активными подкатегориями.

```bash
curl "https://biohayat.ru/api/v1/categories"
```

```json
{
  "ok": true,
  "data": [
    {
      "id": "...", "slug": "vitaminy", "name": "Витамины",
      "description": null, "image": "/uploads/cat.webp", "icon": "pill",
      "children": [
        { "id": "...", "slug": "vitamin-d", "name": "Витамин D", "description": null, "image": null, "icon": null }
      ]
    }
  ]
}
```

### GET /search?q= — быстрые подсказки

До **10 товаров** для живого поиска. `q` обрезается до 100 символов; короче 2 символов — пустой список.

```bash
curl "https://biohayat.ru/api/v1/search?q=колаген"
```

```json
{ "ok": true, "data": [ /* карточки товаров */ ], "meta": { "query": "колаген" } }
```

### POST /auth/register — регистрация

Rate limit: **5 попыток / 15 минут** на телефон+IP.

Тело: `name` (≥ 2 символа), `phone`, `password` (≥ 6 символов), `email` (опционально).

```bash
curl -X POST "https://biohayat.ru/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Амина","phone":"+7 (928) 123-45-67","password":"secret123","email":"amina@example.com"}'
```

Ответ `201`:

```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "customer": {
      "id": "cml2...", "phone": "+79281234567", "name": "Амина",
      "email": "amina@example.com", "city": null, "createdAt": "2026-06-09T12:00:00.000Z"
    }
  }
}
```

Ошибки: `409 PHONE_TAKEN`, `400 VALIDATION_ERROR`, `429 RATE_LIMITED`.

### POST /auth/login — вход

Rate limit: **5 попыток / 15 минут** на телефон+IP. Удалённым (`deletedAt`) и заблокированным (`isActive=false`) аккаунтам вход запрещён — возвращается тот же `401 INVALID_CREDENTIALS` (причина не раскрывается).

```bash
curl -X POST "https://biohayat.ru/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"89281234567","password":"secret123"}'
```

Ответ `200` — как у register: `{ token, customer }`.

### GET /account/me — профиль (Bearer)

```bash
curl "https://biohayat.ru/api/v1/account/me" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "ok": true,
  "data": { "id": "cml2...", "phone": "+79281234567", "name": "Амина", "email": null, "city": null, "createdAt": "2026-06-09T12:00:00.000Z" }
}
```

### GET /account/orders — заказы покупателя (Bearer)

```bash
curl "https://biohayat.ru/api/v1/account/orders" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "ok": true,
  "data": [
    {
      "id": "cml3...", "number": 142,
      "status": "SHIPPED", "statusLabel": "Передана в доставку",
      "totalKopecks": 390000, "discountKopecks": 0, "promoCode": null,
      "address": "г. Грозный, ул. ...", "comment": null,
      "trackingNumber": "1234567890", "trackingCarrier": "cdek",
      "createdAt": "2026-06-01T09:30:00.000Z",
      "items": [
        { "productId": "cml1...", "name": "Коллаген морской", "priceKopecks": 130000, "qty": 3 }
      ]
    }
  ],
  "meta": { "total": 1 }
}
```

Статусы заказа: `NEW`, `CONFIRMED`, `PAID`, `ASSEMBLING`, `SHIPPED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED` (русская подпись — в `statusLabel`).

### POST /orders — оформление заказа

Bearer-токен **опционален**: если передан и валиден — заказ привязывается к аккаунту, иначе оформляется как гостевой. Rate limit: 10 заказов / 15 минут с одного IP.

Тело:

| Поле           | Тип                                  | Обязательно | Примечание                          |
| -------------- | ------------------------------------ | ----------- | ------------------------------------ |
| `customerName` | string 2..120                        | да          |                                      |
| `phone`        | string ≥ 10                          | да          |                                      |
| `email`        | string (email)                       | нет         |                                      |
| `address`      | string ≤ 500                         | нет         |                                      |
| `comment`      | string ≤ 1000                        | нет         |                                      |
| `consent`      | литерал `true`                       | да          | Согласие на обработку ПДн (152-ФЗ)   |
| `items`        | `[{ productId: string, qty: 1..99 }]` | да (≥ 1)   | Цены клиент НЕ передаёт — берутся из БД |

Дубли `productId` суммируются. Несуществующий или неактивный товар → `400 PRODUCT_NOT_FOUND`.

```bash
curl -X POST "https://biohayat.ru/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customerName": "Амина",
    "phone": "+79281234567",
    "address": "г. Грозный, ул. Нурседы Хабусиевой, 51",
    "consent": true,
    "items": [{ "productId": "cml1...", "qty": 2 }]
  }'
```

Ответ `201`:

```json
{
  "ok": true,
  "data": {
    "orderId": "cml3...",
    "number": 143,
    "totalKopecks": 260000,
    "status": "NEW",
    "items": [{ "productId": "cml1...", "name": "Коллаген морской", "priceKopecks": 130000, "qty": 2 }]
  }
}
```

После создания заказ автоматически уходит лидом в Битрикс24 (ошибка интеграции не влияет на ответ).

### GET /settings — публичные настройки

```bash
curl "https://biohayat.ru/api/v1/settings"
```

```json
{
  "ok": true,
  "data": {
    "siteName": "ХАЯТ",
    "phone": "+7 (928) 677-50-50",
    "email": "info@biohayat.ru",
    "address": "г. Грозный, ул. Нурседы Хабусиевой, 51",
    "workingHours": "Пн–Вс, 9:00–18:00",
    "socials": { "instagram": null, "telegram": null, "whatsapp": null, "vk": null, "wildberries": null },
    "freeDeliveryThresholdKopecks": 2000000,
    "badDisclaimer": "БАД. НЕ ЯВЛЯЕТСЯ ЛЕКАРСТВЕННЫМ СРЕДСТВОМ. Имеются противопоказания, необходима консультация специалиста."
  }
}
```

---

## Примечания для React Native

- **Хранение токена:** только в защищённом хранилище — `expo-secure-store` (Expo) или `react-native-keychain`. НЕ хранить в `AsyncStorage` в открытом виде. Токен живёт 30 дней; глобальный обработчик `401` должен чистить хранилище и переводить на экран входа.
- **Пагинация:** для бесконечного скролла каталога подгружайте `page + 1`, пока `page * perPage < meta.total`. Параметры фильтров при этом не меняйте — иначе сбрасывайте список и начинайте с `page=1`.
- **Поиск:** для живых подсказок используйте `GET /search` с дебаунсом 250–300 мс; полную выдачу — через `GET /products?q=`.
- **Деньги:** суммы в копейках — форматируйте на клиенте (`priceKopecks / 100` + `Intl.NumberFormat("ru-RU")`).
- **Изображения:** пути вида `/uploads/...` — относительные, добавляйте origin сайта (`https://biohayat.ru` + `image`).
- **Rate limit:** при `429` уважайте заголовок `Retry-After` (секунды) — покажите пользователю сообщение и заблокируйте повторную отправку.
- **Дисклеймер БАД:** строку `badDisclaimer` из `/settings` обязательно показывать на карточке товара и в корзине (требование к рекламе БАД).
- **Сеть:** все ответы имеют `Content-Type: application/json`; проверяйте поле `ok` до чтения `data`.
