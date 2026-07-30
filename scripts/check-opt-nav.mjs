/**
 * Переходы между розницей и оптом: вход в опт заметен с розничной страницы,
 * возврат в розницу заметен с оптовой, и оба — на десктопе и на мобильном.
 * Инструмент разработки, в сборку не входит.
 *
 *   BASE=http://127.0.0.1:3000 node scripts/check-opt-nav.mjs
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://127.0.0.1:3007";
let failed = 0;
const check = (name, ok, note = "") => {
  console.log(`  ${ok ? "OK    " : "ОШИБКА"} ${name}${note ? ` — ${note}` : ""}`);
  if (!ok) failed++;
};

/** Площадь кликабельной цели и кегль подписи — мера «заметности». */
const probe = (page, selector) =>
  page.evaluate((sel) => {
    // Из всех видимых берём самый крупный: десктопная и мобильная разметки
    // живут в DOM одновременно, а «заметность» — это про самую крупную цель,
    // а не про первую попавшуюся в порядке разметки.
    const el = [...document.querySelectorAll(sel)]
      .map((n) => ({ n, b: n.getBoundingClientRect() }))
      .filter(({ b }) => b.width > 0 && b.height > 0)
      .sort((x, y) => y.b.width * y.b.height - x.b.width * x.b.height)[0]?.n;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      area: Math.round(r.width * r.height),
      fontSize: Math.round(parseFloat(cs.fontSize)),
      text: (el.textContent || "").trim().slice(0, 30),
      top: Math.round(r.top),
    };
  }, selector);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});

for (const [w, label] of [
  [1440, "десктоп"],
  [390, "мобайл"],
]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 900 },
    hasTouch: w < 800,
    isMobile: w < 800,
  });
  await ctx.addCookies([{ name: "hayat_cookie_consent", value: "1", url: base }]);
  const page = await ctx.newPage();
  console.log(`\n── ${label} (${w}px) ──`);

  // 1. С розничной главной виден вход в опт
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const toOpt = await probe(page, '[data-to-opt]');
  check(
    "с розницы виден вход в опт",
    Boolean(toOpt),
    toOpt ? `«${toOpt.text}», ${toOpt.w}×${toOpt.h}px, шрифт ${toOpt.fontSize}px` : "не найден",
  );
  if (toOpt) {
    check("вход в опт не мельче 13px", toOpt.fontSize >= 13, `${toOpt.fontSize}px`);
    // 24px — минимальный размер цели по WCAG 2.2 (Target Size, Minimum);
    // на мобильном держим привычные 44px по короткой стороне.
    const minSide = w < 800 ? 44 : 24;
    check(
      `короткая сторона цели ≥ ${minSide}px`,
      Math.min(toOpt.w, toOpt.h) >= minSide,
      `${toOpt.w}×${toOpt.h}px`,
    );
  }

  // 2. Переход работает
  if (toOpt) {
    await page.evaluate((sel) => {
      const el = [...document.querySelectorAll(sel)]
        .map((n) => ({ n, b: n.getBoundingClientRect() }))
        .filter(({ b }) => b.width > 0 && b.height > 0)
        .sort((x, y) => y.b.width * y.b.height - x.b.width * x.b.height)[0]?.n;
      el?.click();
    }, "[data-to-opt]");
    await page.waitForURL("**/opt", { timeout: 8000 }).catch(() => {});
    check("переход ведёт на /opt", new URL(page.url()).pathname.startsWith("/opt"), page.url());
  } else {
    await page.goto(base + "/opt", { waitUntil: "networkidle" });
  }
  await page.waitForTimeout(500);

  // 3. С опта виден возврат в розницу
  const toRetail = await probe(page, "[data-to-retail]");
  check(
    "с опта виден возврат в розницу",
    Boolean(toRetail),
    toRetail ? `«${toRetail.text}», ${toRetail.w}×${toRetail.h}px, шрифт ${toRetail.fontSize}px` : "не найден",
  );
  if (toRetail) {
    check("возврат не мельче 13px", toRetail.fontSize >= 13, `${toRetail.fontSize}px`);
    check(
      "возврат в верхней части экрана (не только в подвале)",
      toRetail.top < 200,
      `top=${toRetail.top}px`,
    );
  }

  // 4. Ни одной функциональной подписи мельче 12px в шапке и нижнем меню опта
  const tiny = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("header a, header button, nav a, nav button")) {
      const t = (el.textContent || "").trim();
      if (!t) continue;
      for (const node of el.querySelectorAll("*")) {
        const own = Array.from(node.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim())
          .join("");
        if (!own) continue;
        const fs = parseFloat(getComputedStyle(node).fontSize);
        if (fs < 12) out.push(`${own.slice(0, 18)} (${Math.round(fs)}px)`);
      }
    }
    return [...new Set(out)];
  });
  check("нет подписей мельче 12px в навигации опта", tiny.length === 0, tiny.join(", ") || "чисто");

  await ctx.close();
}

await browser.close();
console.log(failed === 0 ? "\n✅ переходы розница ↔ опт в порядке" : `\n❌ провалено: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
