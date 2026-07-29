// Проверка: списочные ссылки не грузятся пачкой, но подгружаются по наведению.
import { chromium } from "playwright";
const base = process.env.BASE ?? "http://127.0.0.1:3007";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "hayat_cookie_consent", value: "1", url: base }]);
const p = await ctx.newPage();
const rsc = [];
p.on("request", (r) => { if (r.resourceType() === "fetch" && r.url().includes("_rsc")) rsc.push(r.url().replace(base, "").split("?")[0]); });
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(2500);
console.log("до наведения RSC-запросов:", rsc.length);

const link = p.locator(`a[href^="/category/"]`).first();
await link.scrollIntoViewIfNeeded();
await p.waitForTimeout(600);
console.log("после появления на экране:", rsc.length);
const href = await link.getAttribute("href");
await link.hover();
await p.waitForTimeout(1500);
console.log(`после наведения на ${href}:`, rsc.length, "→", rsc.slice(-2).join(", ") || "(нет)");
await b.close();
