/**
 * Замер типографики на живой странице: длинные строки, текст мельче 12px,
 * анимация геометрических свойств. Показывает, ЧТО именно нашёл аудит, —
 * детектор даёт только вид нарушения, без селектора.
 * Инструмент разработки, в сборку не входит.
 *
 *   BASE=http://127.0.0.1:3000 PAGE=/product/5-htp-100 node scripts/probe.mjs
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://127.0.0.1:3007";
const path = process.env.PAGE ?? "/";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "hayat_cookie_consent", value: "1", url: base }]);
const page = await ctx.newPage();
await page.goto(base + path, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const res = await page.evaluate(() => {
  const long = [];
  const tiny = [];
  const geo = [];
  const BAD = /\b(height|width|padding|margin|all)\b/;
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const tp = cs.transitionProperty;
    if (tp && tp !== "all" && tp !== "none" && BAD.test(tp)) {
      geo.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || "").toString().slice(0, 90),
        tp,
      });
    }
    const direct = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (!direct || direct.length < 6) continue;
    const fs = parseFloat(cs.fontSize);
    const w = el.getBoundingClientRect().width;
    const ch = w / (fs * 0.5);
    const cls = (el.className || "").toString().split(" ").slice(0, 4).join(" ");
    if (ch > 80 && direct.length > 60) long.push({ cls, ch: Math.round(ch), fs, text: direct.slice(0, 60) });
    if (fs < 12 && direct.length > 6) tiny.push({ cls, fs, text: direct.slice(0, 40) });
  }
  return { long, tiny, geo: geo.slice(0, 8) };
});

console.log("LONG:", JSON.stringify(res.long, null, 1));
console.log("TINY:", JSON.stringify(res.tiny, null, 1));
console.log("GEO-TRANSITION:", JSON.stringify(res.geo, null, 1));

await browser.close();
