/**
 * Проверка, что боковое меню каталога переживает переход между разделами:
 * тот же узел DOM, сохранённая прокрутка, без полноэкранного прелоадера.
 * Инструмент разработки, в сборку не входит.
 *
 *   BASE=http://127.0.0.1:3000 node scripts/check-catalog-nav.mjs
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://127.0.0.1:3007";
let failed = 0;
const check = (name, ok) => {
  console.log(`  ${ok ? "OK    " : "ОШИБКА"} ${name}`);
  if (!ok) failed++;
};

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "hayat_cookie_consent", value: "1", url: base }]);
const page = await ctx.newPage();

// Полные загрузки документа считаем отдельно: переход по категории должен
// идти клиентской навигацией, без запроса HTML целиком.
let docLoads = 0;
page.on("response", (r) => {
  if (r.request().resourceType() === "document" && r.status() < 400) docLoads++;
});

await page.goto(base + "/catalog", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
docLoads = 0;

const sidebar = page.locator("aside").first();
check("боковое меню есть на /catalog", await sidebar.isVisible());

// Помечаем узел меню: если после перехода метка на месте — узел тот же,
// значит меню не перерисовывалось.
const scrollable = await page.evaluate(() => {
  const a = document.querySelector("aside");
  a.dataset.mark = "keep-me";
  const inner = a.querySelector("div");
  // Прокрутку проверяем, только если список действительно длиннее окна:
  // иначе scrollTop останется нулём и проверка мерила бы саму себя.
  if (inner.scrollHeight <= inner.clientHeight) return false;
  inner.scrollTop = 120;
  return true;
});

const link = page.locator('aside a[href^="/category/"]').first();
const href = await link.getAttribute("href");
await link.click();
await page.waitForURL(`**${href}`, { timeout: 8000 });
await page.waitForTimeout(900);

const after = await page.evaluate(() => {
  const a = document.querySelector("aside");
  return {
    mark: a?.dataset.mark ?? null,
    scroll: Math.round(a?.querySelector("div")?.scrollTop ?? -1),
    active: a?.querySelector('[aria-current="page"]')?.textContent?.trim() ?? null,
    h1: document.querySelector("h1")?.textContent?.trim() ?? null,
  };
});

check(`переход на ${href} без перезагрузки документа (${docLoads})`, docLoads === 0);
check("меню — тот же узел DOM, не перерисовано", after.mark === "keep-me");
if (scrollable) check(`прокрутка меню сохранилась (${after.scroll}px)`, after.scroll === 120);
else console.log("  —      список короче окна, прокрутку проверить нечем");
check(`активный раздел подсветился: ${after.active}`, Boolean(after.active));
check(`товары обновились: «${after.h1}»`, after.h1 && after.h1 !== "Каталог товаров");

// Второй переход — обратно в «Все товары»
await page.locator('aside a[href="/catalog"]').first().click();
await page.waitForURL("**/catalog", { timeout: 8000 });
await page.waitForTimeout(700);
const back = await page.evaluate(() => ({
  mark: document.querySelector("aside")?.dataset.mark ?? null,
  active: document.querySelector('aside [aria-current="page"]')?.textContent?.trim() ?? null,
}));
check("меню пережило и второй переход", back.mark === "keep-me");
check(`подсветка переехала: ${back.active}`, back.active?.includes("Все товары"));

await browser.close();
console.log(failed === 0 ? "\n✅ меню каталога не перезагружается" : `\n❌ провалено: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
