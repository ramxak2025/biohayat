import "server-only";

/**
 * Ответ-редирект после отправки формы (POST → GET).
 *
 * Location намеренно относительный: в обработчиках маршрутов `req.url`
 * содержит внутренний адрес приложения (http://localhost:3000), а не адрес,
 * по которому пришёл посетитель, — редирект по нему уводил бы на чужой origin,
 * куда cookie сессии не отправляется. Относительный адрес браузер разрешает
 * относительно текущего и одинаково верен и для https-домена, и для доступа
 * по IP.
 *
 * Статус 303 обязателен: он превращает POST в обычный GET по адресу назначения
 * (307 по умолчанию повторил бы POST).
 */
export function redirectAfterPost(path: string): Response {
  return new Response(null, { status: 303, headers: { Location: path } });
}

/**
 * Оборачивает обработчик формы так, чтобы непредвиденная ошибка не превращалась
 * в пустой 500.
 *
 * Ответ 500 без тела и без Content-Type браузеру нечем показать (плюс стоит
 * заголовок nosniff), поэтому он предлагает *скачать файл* с именем маршрута —
 * пользователь видит загрузку файла «login» вместо входа. Вместо этого пишем
 * причину в лог сервера и возвращаем человека на форму с понятным сообщением.
 */
export async function handleFormPost(
  where: string,
  backPath: string,
  run: () => Promise<Response>,
): Promise<Response> {
  try {
    return await run();
  } catch (e) {
    // console.error — единственный вызов console, переживающий прод-сборку
    // (см. compiler.removeConsole в next.config.ts).
    console.error(`[form] ${where}:`, e);
    return redirectAfterPost(backPath);
  }
}
