#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Авто-деплой: проверяет, появились ли новые коммиты в текущей
#  ветке на GitHub, и если да — подтягивает их, пересобирает
#  контейнеры и применяет изменения схемы БД.
#
#  Установка (один раз, на сервере):
#    chmod +x /root/biohayat/scripts/auto-deploy.sh
#    crontab -e   # добавить строку:
#    */5 * * * * flock -n /tmp/biohayat-deploy.lock /root/biohayat/scripts/auto-deploy.sh >> /var/log/biohayat-deploy.log 2>&1
#
#  flock защищает от наложения запусков (сборка идёт дольше 5 минут).
#  Лог: /var/log/biohayat-deploy.log
# ─────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

git fetch origin "$BRANCH" --quiet

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

# Нет новых коммитов — выходим молча (cron не засоряет лог)
[ "$LOCAL" = "$REMOTE" ] && exit 0

echo "──────────────────────────────────────────────"
echo "$(date '+%F %T') Обновление $BRANCH: ${LOCAL:0:7} → ${REMOTE:0:7}"

# Только fast-forward: если история ветки переписана или есть локальные
# правки — останавливаемся, чтобы ничего не потерять (смотрите лог).
git pull --ff-only origin "$BRANCH"

docker compose up -d --build

# Применить изменения схемы. Без --accept-data-loss prisma откажется
# выполнять разрушительные изменения — это намеренная защита данных.
docker compose exec -T app pnpm db:push

# Прогрев кэша: первый запрос ISR-страницы рендерит её, дальше отдаётся статика.
# Прогреваем ключевые страницы, чтобы первые посетители получили мгновенный ответ.
sleep 5
for p in / /catalog /sale /articles; do
  curl -s -o /dev/null --max-time 20 "http://localhost:3000$p" || true
done
# Все товары и категории (через sitemap, если доступен)
curl -s --max-time 20 "http://localhost:3000/sitemap.xml" \
  | grep -o "<loc>[^<]*</loc>" | sed -e 's|</\?loc>||g' \
  | sed -E 's|https?://[^/]+||' | head -200 \
  | while read -r p; do curl -s -o /dev/null --max-time 20 "http://localhost:3000$p" || true; done

echo "$(date '+%F %T') Готово: $(git rev-parse --short HEAD)"
