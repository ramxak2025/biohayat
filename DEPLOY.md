# Деплой на Beget (Облачный VPS, Ubuntu + Docker)

Рекомендуемый тариф: «Профессиональный» (2 vCPU / 4 ГБ) и выше. ОС: Ubuntu 24.04.

## 1. Подготовка сервера
```bash
apt update && apt -y upgrade
# Docker (если не установлен при создании сервера):
command -v docker || curl -fsSL https://get.docker.com | sh
docker compose version   # проверка
```

## 2. Получить код
```bash
cd /opt
git clone https://github.com/ramxak2025/biohayat.git
cd biohayat
```

## 3. Настроить переменные окружения
```bash
cp .env.example .env
# Сгенерировать секрет:
sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=\"$(openssl rand -base64 48)\"|" .env
nano .env   # задать POSTGRES_PASSWORD, DOMAIN, NEXT_PUBLIC_SITE_URL, ADMIN_PASSWORD
```

## 4. Запуск
```bash
docker compose up -d --build       # сборка + БД + приложение
docker compose exec app pnpm db:push   # создать таблицы
docker compose exec app pnpm db:seed   # данные (119 товаров, админ, настройки)
```
Сайт доступен на `http://IP_СЕРВЕРА:3000`. Админка: `/admin/login`.

## 5. HTTPS с доменом (Caddy, авто-SSL)
1. Привяжите A-запись домена к IP сервера (в DNS).
2. В `.env` задайте `DOMAIN` и `NEXT_PUBLIC_SITE_URL=https://ваш-домен`.
3. Запустите прокси:
```bash
docker compose --profile proxy up -d
```
Caddy сам получит сертификат Let's Encrypt. Сайт откроется по `https://ваш-домен`.

## Обновление версии
```bash
cd /opt/biohayat && git pull
docker compose up -d --build
docker compose exec app pnpm db:push   # если менялась схема
```

`db:push` не пропускать: если схема БД отстала от кода, страницы, которым нужна
недостающая колонка, отвечают 500. Например, при отсутствии `Customer.bonusBalance`
перестаёт работать вход в личный кабинет, хотя каталог продолжает открываться.
Настоящая причина видна в `docker compose logs app` строкой вида
`[api] api/v1/auth/login: ... column ... does not exist`.

## Автодеплой из GitHub
Workflow `.github/workflows/deploy.yml` разворачивает ветку
`claude/supplements-ecommerce-bitrix24-6psN0` на сервер при каждом пуше, но
только если в GitHub заданы секреты (Settings → Secrets and variables → Actions):
`DEPLOY_HOST`, `DEPLOY_USER` и `DEPLOY_PASSWORD` либо `DEPLOY_SSH_KEY`.

Без них запуск падает на первом шаге с явным сообщением о том, каких секретов не
хватает, — и сайт на сервере остаётся на прежней версии. В этом случае
выкатывайте вручную командами из раздела «Обновление версии» выше.

## Проверка входа после деплоя
```bash
# телефон и пароль — от существующего тестового покупателя
docker compose exec -T app pnpm check:auth https://ваш-домен +79991234567 пароль
```
Проверяет, что вход выдаёт сессию и открывает кабинет. Ничего не создаёт в БД.

Если сайт работает **без домена**, по `http://IP_СЕРВЕРА:3000`, укажите этот же
адрес — cookie сессии подстраивается под протокол автоматически.

## Полезное
- Логи: `docker compose logs -f app`
- Перезапуск: `docker compose restart app`
- Бэкап БД: `docker compose exec db pg_dump -U biohayat biohayat > backup.sql`
- Изображения сохраняются в Docker-томе `uploads`, БД — в `db-data`.
