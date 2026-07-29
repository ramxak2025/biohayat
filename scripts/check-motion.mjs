// Проверка: контент виден и анимация появления реально проигрывается.
import { chromium } from "playwright";
const base = process.env.BASE ?? "http://127.0.0.1:3007";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
for (const [label, opts] of [["обычно", {}], ["reduced-motion", { reducedMotion: "reduce" }]]) {
  const ctx = await b.newContext({ viewport: { width: Number(process.env.W ?? 1440), height: 900 }, ...opts });
  await ctx.addCookies([{ name: "hayat_cookie_consent", value: "1", url: base }]);
  const p = await ctx.newPage();
  await p.goto(base + "/", { waitUntil: "domcontentloaded" });
  const early = await p.evaluate(() => {
    const h1 = document.querySelector("h1");
    const cs = h1 && getComputedStyle(h1);
    return { op: cs?.opacity, anim: cs?.animationName };
  });
  await p.waitForTimeout(2000);
  const hidden = await p.evaluate(() => {
    let n = 0;
    for (const el of document.querySelectorAll(".reveal, .reveal-stagger > *, [data-hero-item]")) {
      const cs = getComputedStyle(el);
      if (el.offsetParent === null && cs.position !== "fixed") continue;
      if (parseFloat(cs.opacity) < 0.9 || cs.visibility === "hidden") n++;
    }
    return n;
  });
  console.log(`${label.padEnd(15)} h1 сразу: opacity=${early.op} animation=${early.anim} · скрытых блоков через 2с: ${hidden}`);
  await ctx.close();
}
await b.close();
