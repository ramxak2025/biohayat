/**
 * Проверка входа в личный кабинет на работающем сайте.
 *
 * Стережёт три поломки, из-за которых вход уже переставал работать:
 *   1. редирект уводил на внутренний адрес приложения (http://localhost:3000)
 *      вместо адреса посетителя — cookie сессии туда не отправляется;
 *   2. ответ 307 вместо 303 — браузер повторял POST по адресу назначения;
 *   3. cookie с флагом Secure по http — браузер молча её выбрасывал.
 *
 * Браузер не нужен, поэтому запускать можно откуда угодно, в том числе внутри
 * контейнера с приложением:
 *
 *   pnpm check:auth https://biohayat.ru +79991234567 пароль
 *
 * Телефон и пароль — от существующего тестового покупателя. Скрипт ничего не
 * создаёт и не удаляет: только выполняет вход (обновится lastLoginAt).
 */

const [baseArg, phone, password] = process.argv.slice(2);

if (!baseArg || !phone || !password) {
  console.error("Использование: pnpm check:auth <адрес сайта> <телефон> <пароль>");
  process.exit(2);
}

const base = baseArg.replace(/\/$/, "");
const isHttps = base.startsWith("https://");
let failed = 0;

/** Пояснение печатаем только у провалившейся проверки — иначе оно сбивает с толку. */
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "OK    " : "ОШИБКА"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log(`Проверяю вход: ${base}`);

  const res = await fetch(`${base}/account/login`, {
    method: "POST",
    body: new URLSearchParams({ phone, password }),
    redirect: "manual",
  });

  // 303, а не 307: только он превращает POST в обычный GET.
  check("ответ 303 (POST превращается в GET)", res.status === 303, `получен статус ${res.status}`);
  if (res.status !== 303) {
    // 303 превращает POST в GET; при 307 браузер повторит POST по адресу назначения.
    console.log("\n❌ вход не работает");
    process.exit(1);
  }

  const location = res.headers.get("location") ?? "";
  check(
    "редирект ведёт на сам сайт, а не на внутренний адрес",
    location.startsWith("/") || location.startsWith(`${base}/`),
    `Location: ${location}`,
  );

  // Неверный телефон/пароль тоже дают 303, но с кодом ошибки в адресе.
  if (location.includes("error=")) {
    const code = new URLSearchParams(location.split("?")[1] ?? "").get("error");
    console.log(`  ОШИБКА учётные данные отклонены сайтом (${code})`);
    console.log("\n❌ проверьте телефон и пароль тестового покупателя");
    process.exit(1);
  }

  const setCookie = res.headers.getSetCookie().find((c) => c.startsWith("hayat_customer="));
  check("сессия выдана", Boolean(setCookie), "нет cookie hayat_customer");
  if (!setCookie) {
    console.log("\n❌ вход не работает");
    process.exit(1);
  }

  const secure = /;\s*Secure/i.test(setCookie);
  check(
    isHttps ? "cookie помечена Secure (сайт на https)" : "cookie без Secure (сайт на http)",
    secure === isHttps,
    secure ? "Secure стоит" : "Secure не стоит",
  );
  check("cookie недоступна скриптам (HttpOnly)", /;\s*HttpOnly/i.test(setCookie));

  // Переходим по редиректу с полученной cookie — должен открыться кабинет.
  const token = setCookie.split(";")[0];
  const target = location.startsWith("/") ? `${base}${location}` : location;
  const page = await fetch(target, { headers: { cookie: token } });
  const html = await page.text();
  check(
    "кабинет открывается после входа",
    html.includes("Здравствуйте"),
    "страница всё ещё показывает форму входа",
  );

  console.log(failed === 0 ? "\n✅ вход работает" : `\n❌ проблем: ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Не удалось выполнить проверку:", e instanceof Error ? e.message : e);
  process.exit(1);
});
