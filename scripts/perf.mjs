/**
 * Замер загрузки страницы: вес ресурсов по типам, LCP, время до
 * интерактивности. Инструмент разработки, в сборку не входит.
 *
 *   BASE=http://127.0.0.1:3007 PAGE=/catalog node scripts/perf.mjs
 *   NET=slow node scripts/perf.mjs      # с эмуляцией мобильной сети и CPU
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://127.0.0.1:3007";
const path = process.env.PAGE ?? "/";
const slow = process.env.NET === "slow";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "hayat_cookie_consent", value: "1", url: base }]);
const page = await ctx.newPage();

const bytes = {};
const perType = (t) => (bytes[t] ??= { count: 0, size: 0 });
page.on("response", async (res) => {
  const t = res.request().resourceType();
  const len = Number(res.headers()["content-length"] || 0);
  let size = len;
  if (!size) {
    try {
      size = (await res.body()).length;
    } catch {
      size = 0;
    }
  }
  const b = perType(t);
  b.count++;
  b.size += size;
});

if (slow) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

// LCP доступен только через PerformanceObserver — getEntriesByType его не
// отдаёт. Наблюдатель ставится до навигации, чтобы не потерять запись.
await page.addInitScript(() => {
  window.__lcp = null;
  new PerformanceObserver((list) => {
    const e = list.getEntries().pop();
    if (e) window.__lcp = { time: e.startTime, tag: e.element?.tagName || "", cls: (e.element?.className || "").toString().slice(0, 40) };
  }).observe({ type: "largest-contentful-paint", buffered: true });
});

const t0 = Date.now();
await page.goto(base + path, { waitUntil: "load" });
const loadMs = Date.now() - t0;
await page.waitForTimeout(2500);

const metrics = await page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0] || {};
  const lcp = window.__lcp;
  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  const longTasks = performance.getEntriesByType("longtask") || [];
  return {
    ttfb: Math.round(nav.responseStart || 0),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
    load: Math.round(nav.loadEventEnd || 0),
    fcp: fcp ? Math.round(fcp.startTime) : null,
    lcp: lcp ? Math.round(lcp.time) : null,
    lcpEl: lcp ? `${lcp.tag}.${lcp.cls}` : "",
    longTaskMs: Math.round(longTasks.reduce((s, t) => s + t.duration, 0)),
    domNodes: document.querySelectorAll("*").length,
  };
});

const kb = (n) => (n / 1024).toFixed(1) + " KB";
console.log(`\n${path}${slow ? "  [медленная сеть + CPU ×4]" : ""}`);
console.log(`  TTFB ${metrics.ttfb}ms · FCP ${metrics.fcp}ms · LCP ${metrics.lcp}ms · load ${metrics.load}ms (${loadMs}ms wall)`);
console.log(`  LCP-элемент: ${metrics.lcpEl}`);
console.log(`  DOM-узлов: ${metrics.domNodes} · долгих задач: ${metrics.longTaskMs}ms`);
let total = 0;
for (const [t, v] of Object.entries(bytes).sort((a, b) => b[1].size - a[1].size)) {
  total += v.size;
  console.log(`  ${t.padEnd(12)} ${String(v.count).padStart(3)} шт  ${kb(v.size).padStart(10)}`);
}
console.log(`  ${"ИТОГО".padEnd(12)}      ${kb(total).padStart(10)}\n`);

await browser.close();
