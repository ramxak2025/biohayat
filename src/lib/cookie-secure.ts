/**
 * Secure-флаг для cookie: по фактическому протоколу сайта, а не NODE_ENV.
 * Прод может работать по HTTP (доступ по IP до подключения домена) —
 * браузеры выбрасывают Secure-cookie на HTTP, и сессии «не живут».
 * NEXT_PUBLIC_SITE_URL инлайнится на сборке и доступен в т.ч. в proxy.
 */
export function cookieSecure(): boolean {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").startsWith("https://");
}
