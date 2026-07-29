/**
 * Проверка жестов в просмотрщике историй: закрытие потягиванием вниз,
 * возврат на место при коротком движении, Esc, переключение по тапу.
 * Инструмент разработки, в сборку не входит.
 *
 *   BASE=http://127.0.0.1:3000 node scripts/check-stories.mjs
 *
 * Жест подаётся настоящими тач-событиями через CDP, а не мышью: синтетические
 * mouse.move Playwright склеивает между кадрами, и до страницы доходила лишь
 * часть пути — проверка тогда мерила артефакт драйвера, а не поведение.
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://127.0.0.1:3007";
let failed = 0;

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
// Истории показываются только на мобильных — десктоп открывается героем.
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
await ctx.addCookies([{ name: "hayat_cookie_consent", value: "1", url: base }]);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);

const viewer = () => page.locator('[role="dialog"][aria-label^="Истории"]');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open() {
  if (await viewer().isVisible().catch(() => false)) return;
  await page.locator("[data-stories] button").first().click();
  await page.waitForTimeout(350);
}

/** Свайп пальцем вниз на dy пикселей примерно за ms миллисекунд. */
async function swipeDown(dy, ms = 400, stepsOverride) {
  const x = 195;
  const y = 380;
  const steps = stepsOverride ?? Math.max(4, Math.round(ms / 16));
  const point = (py) => [{ x, y: py, radiusX: 10, radiusY: 10, force: 1 }];

  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(y) });
  const t0 = Date.now();
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: point(y + (dy * i) / steps),
    });
    if (ms) await sleep(ms / steps);
  }
  const took = Date.now() - t0;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(450);
  return { ms: took, speed: dy / Math.max(1, took) };
}

/** Верх «листа» просмотрщика: 0 — окно на своём месте, не съехало. */
const sheetTop = () =>
  page.evaluate(() => {
    const sheet = document.querySelector('[role="dialog"] > div:nth-child(2)');
    return sheet ? Math.round(sheet.getBoundingClientRect().top) : null;
  });

function check(name, ok) {
  console.log(`  ${ok ? "OK    " : "ОШИБКА"} ${name}`);
  if (!ok) failed++;
}

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);

console.log("Проверяю истории:", base);

await open();
check("просмотрщик открывается по кружку", await viewer().isVisible());

// Длинное потягивание вниз закрывает
await swipeDown(220, 500);
check("тянем вниз на 220px — закрывается", !(await viewer().isVisible().catch(() => false)));

// Короткое — возвращается на место
await open();
await swipeDown(45, 500);
check("тянем на 45px — остаётся открытым", await viewer().isVisible());

const shift = await sheetTop();
check(`окно вернулось в исходную позицию (top=${shift})`, shift !== null && Math.abs(shift) <= 1);

// Быстрый бросок закрывает раньше порога расстояния
const fling = await swipeDown(70, 0, 3);
check(
  `бросок 70px за ${fling.ms}мс (${fling.speed.toFixed(2)} px/мс) — закрывается`,
  !(await viewer().isVisible().catch(() => false)),
);

// Esc закрывает
await open();
check("открылся снова", await viewer().isVisible());
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
check("Esc закрывает", !(await viewer().isVisible().catch(() => false)));

// Тап по правой трети переключает историю, а не закрывает
await open();
const before = await viewer().getAttribute("aria-label");
await page.touchscreen.tap(340, 500);
await page.waitForTimeout(400);
const after = await viewer().getAttribute("aria-label").catch(() => null);
check(`тап справа переключает историю (${before} → ${after})`, after !== null && after !== before);

// Перетаскивание не должно заодно переключать историю
const beforeDrag = await viewer().getAttribute("aria-label");
await swipeDown(50, 400);
const afterDrag = await viewer().getAttribute("aria-label").catch(() => null);
check("перетаскивание не пролистывает историю", afterDrag === beforeDrag);

const top = await sheetTop();
check(`после жестов окно не съехало (top=${top})`, top !== null && Math.abs(top) <= 1);

await browser.close();
console.log(failed === 0 ? "\n✅ жесты работают" : `\n❌ провалено проверок: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
