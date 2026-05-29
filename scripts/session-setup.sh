#!/usr/bin/env bash
# Подготовка окружения для веб-сессий Claude Code:
# запускает PostgreSQL, создаёт БД/роль, синхронизирует схему и наполняет данными.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[setup] Запуск PostgreSQL…"
(service postgresql start 2>/dev/null || pg_ctlcluster 16 main start 2>/dev/null || true)
for i in $(seq 1 15); do pg_isready -q && break || sleep 1; done

echo "[setup] Роль и база…"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='biohayat'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE biohayat LOGIN PASSWORD 'biohayat';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='biohayat'" | grep -q 1 \
  || sudo -u postgres createdb -O biohayat biohayat

[ -f .env ] || cp .env.example .env

echo "[setup] Схема БД…"
pnpm exec prisma db push --skip-generate >/dev/null 2>&1 || pnpm exec prisma db push --skip-generate

COUNT=$(PGPASSWORD=biohayat psql -h 127.0.0.1 -U biohayat -d biohayat -tAc 'SELECT count(*) FROM "Product";' 2>/dev/null || echo 0)
if [ "${COUNT:-0}" = "0" ]; then
  echo "[setup] Наполнение демо-данными…"
  pnpm exec tsx prisma/seed.ts || true
fi

echo "[setup] Готово. Товаров в БД: $(PGPASSWORD=biohayat psql -h 127.0.0.1 -U biohayat -d biohayat -tAc 'SELECT count(*) FROM "Product";' 2>/dev/null || echo '?')"
