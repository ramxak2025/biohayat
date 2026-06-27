import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
// desktop header
const d = await b.newContext({ viewport: { width: 1280, height: 420 } });
const dp = await d.newPage();
await dp.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await dp.waitForTimeout(1200);
await dp.screenshot({ path: "shots/hdr-desktop.png" });
// mobile top (search bar) — logo not in mobile header, but check overall
const m = await b.newContext({ viewport: { width: 390, height: 300 }, deviceScaleFactor: 2, isMobile: true });
const mp = await m.newPage();
await mp.goto("http://localhost:3000/contacts", { waitUntil: "domcontentloaded" });
await mp.waitForTimeout(1000);
await mp.screenshot({ path: "shots/hdr-mobile.png" });
await b.close();
console.log("ok");
