/**
 * Снимки страницы по экранам — для оценки вертикального ритма и отступов.
 * Инструмент разработки, в сборку не входит.
 *
 *   pnpm start           # поднять сборку на нужном порту
 *   BASE=http://127.0.0.1:3000 PAGE=/catalog W=1440 N=6 node scripts/shot-scroll.mjs
 *
 * Переменные: BASE, PAGE, OUT (куда класть png), W/H (вьюпорт), N (число экранов).
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://127.0.0.1:3007";
const out = process.env.OUT ?? ".next/shots";
const path = process.env.PAGE ?? "/";
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 900);
const screens = Number(process.env.N ?? 6);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({ viewport: { width, height } });
await ctx.addCookies([{ name: "hayat_cookie_consent", value: "1", url: base }]);
const page = await ctx.newPage();
await page.goto(base + path, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

// На мобильных прокручивается не окно, а внутренний контейнер #app-scroll
// (на десктопе он lg:contents и скроллит body).
const total = await page.evaluate(() => {
  const inner = document.getElementById("app-scroll");
  const useInner = inner && inner.scrollHeight > inner.clientHeight + 10;
  return useInner ? inner.scrollHeight : document.documentElement.scrollHeight;
});
console.log("scrollHeight", total);

for (let i = 0; i < screens; i++) {
  const y = i * (height - 60);
  if (y > total) break;
  await page.evaluate((v) => {
    const inner = document.getElementById("app-scroll");
    if (inner && inner.scrollHeight > inner.clientHeight + 10) inner.scrollTo(0, v);
    else window.scrollTo(0, v);
  }, y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/s${i}.png` });
  console.log("ok", i, y);
}

await browser.close();
