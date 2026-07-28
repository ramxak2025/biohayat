import "server-only";
import { headers } from "next/headers";

/**
 * Нужен ли флаг `Secure` у cookie сессии.
 *
 * Важно: браузер полностью игнорирует cookie с флагом `Secure`, если страница
 * открыта по обычному http. Раньше флаг ставился по `NODE_ENV === "production"`,
 * поэтому в прод-сборке, открытой по `http://IP_СЕРВЕРА:3000` (штатный вариант
 * деплоя без домена, см. DEPLOY.md), cookie входа молча отбрасывалась и вход
 * не работал вовсе.
 *
 * Определяем протокол по фактическому запросу: Caddy и другие обратные прокси
 * присылают `X-Forwarded-Proto: https`. Так один и тот же контейнер корректно
 * обслуживает и https-домен, и прямой доступ по IP.
 */
export async function shouldSetSecureCookie(): Promise<boolean> {
  const h = await headers();

  // Обратный прокси (Caddy и любой другой) сообщает исходный протокол здесь.
  // Может прийти списком: "https,http" — значимо первое значение.
  const forwardedProto = h.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim().toLowerCase() === "https";
  }

  // Заголовка нет — значит запрос пришёл в приложение напрямую, по http
  // (например, http://IP_СЕРВЕРА:3000). Ставить Secure нельзя: браузер молча
  // выбросит такую cookie, и вход перестанет работать.
  return false;
}
