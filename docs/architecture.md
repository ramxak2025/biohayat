# Архитектура проекта

```
src/
├─ app/
│  ├─ layout.tsx              # корневой layout: шрифт, метаданные, JSON-LD, Метрика
│  ├─ (site)/                 # публичная витрина (общий layout: шапка/футер/меню/чат)
│  │  ├─ layout.tsx
│  │  ├─ page.tsx             # главная
│  │  ├─ catalog/             # каталог + поиск
│  │  ├─ category/[slug]/     # страница категории
│  │  ├─ product/[slug]/      # карточка товара (+ JSON-LD)
│  │  ├─ sale/                # акции
│  │  ├─ cart/                # корзина (клиент)
│  │  ├─ checkout/            # оформление заказа → заявка
│  │  ├─ articles/[slug]/     # материалы/статьи
│  │  ├─ about, contacts, delivery, privacy-policy, oferta
│  ├─ admin/
│  │  ├─ login/               # вход (вне общего layout)
│  │  ├─ logout/route.ts      # выход
│  │  └─ (panel)/             # кабинет (layout с сайдбаром, проверка сессии)
│  │     ├─ page.tsx          # дашборд
│  │     ├─ products/         # CRUD товаров (+ actions.ts)
│  │     ├─ categories/       # CRUD категорий
│  │     ├─ banners/          # CRUD баннеров (рекламные блоки)
│  │     ├─ materials/        # CRUD материалов
│  │     ├─ orders/           # заявки (+ ресинк в Битрикс24)
│  │     └─ settings/         # настройки и интеграции
│  ├─ api/admin/upload/       # загрузка изображений (WebP)
│  ├─ sitemap.ts, robots.ts   # SEO
├─ components/
│  ├─ ui/                     # кнопки, поля, контейнеры, SmartImage, Badge, Prose
│  ├─ site/                   # шапка, футер, мобильное меню, чат, cookie, логотип
│  ├─ product/                # карточка, сетка, галерея, catalog-view
│  ├─ cart/                   # провайдер корзины (localStorage), кнопки
│  └─ admin/                  # оболочка кабинета, UI, формы, загрузчик изображений
├─ lib/
│  ├─ prisma.ts               # singleton Prisma
│  ├─ auth.ts                 # сессии (JWT), хеширование, authenticate()
│  ├─ settings.ts             # настройки сайта (singleton, кеш на запрос)
│  ├─ queries.ts              # выборки для витрины
│  ├─ bitrix.ts               # интеграция Битрикс24 (crm.lead.add, проверка)
│  ├─ seo.ts                  # метаданные + JSON-LD
│  └─ utils.ts                # cn, деньги, slug, телефон
├─ proxy.ts                   # защита /admin (бывш. middleware, Next 16)
prisma/
├─ schema.prisma             # модель данных
├─ seed.ts                   # сиды
└─ seed-data/                # категории и 119 товаров
```

## Ключевые решения
- **Серверные экшены** для всех мутаций (формы без отдельного API), валидация `zod`.
- **Цены в копейках** (`Int`) — без ошибок округления; форматирование `formatMoney`.
- **SEO-автозаполнение**: если поля meta пустые — генерируются из контента (`lib/seo.ts`).
- **Заявки → Битрикс24**: при оформлении создаётся `Order`, затем `syncOrderToBitrix`;
  статус синхронизации хранится в БД, есть повторная отправка из админки.
- **Изображения**: компонент `SmartImage` рисует заглушку до загрузки реального фото;
  загрузка через админку → WebP в `public/uploads`.
- **Кеш/актуальность**: публичные страницы обновляются через `revalidatePath` при
  изменениях в админке.
- **Безопасность**: `/admin/*` защищён `proxy.ts` (проверка JWT), цены при заказе
  перепроверяются по БД, заголовки безопасности в `next.config.ts`.
