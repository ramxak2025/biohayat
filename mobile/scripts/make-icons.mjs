/**
 * Генерация иконок из брендовой марки.
 *
 * Марка (public/brand/logo-mark.png) — по сути одноцветная альфа-маска, поэтому
 * берём из неё ТОЛЬКО альфу, масштабируем и заливаем брендовым цветом из
 * дизайн-токенов (#3a9447). Пиксели исходника не трогаем: в них лежит
 * устаревший оливковый #65852f, который расходится с сайтом и PWA-манифестом.
 */
import sharp from "/Users/ramazan/Proects/Hayat/node_modules/sharp/lib/index.js";
import { mkdirSync } from "node:fs";

const SRC = "/Users/ramazan/Proects/Hayat/public/brand/logo-mark.png";
const OUT = "./assets/icon";
const SIZE = 1024;
const MARK = Math.round(SIZE * 0.68); // 68% — рекомендация HIG для круглой марки
const BRAND = { r: 0x3a, g: 0x94, b: 0x47 };
const BRAND_DARK = { r: 0x5f, g: 0xc0, b: 0x6f }; // осветлённый для тёмной темы
const BG_LIGHT = "#f0f9f1";

mkdirSync(OUT, { recursive: true });

/** Марка нужного размера, залитая цветом, на прозрачном фоне. */
async function tintedMark(size, color) {
  const alpha = await sharp(SRC)
    .ensureAlpha()
    .extractChannel("alpha")
    .resize(size, size, { kernel: "lanczos3" })
    .toBuffer();

  return sharp({ create: { width: size, height: size, channels: 3, background: color } })
    .joinChannel(alpha)
    .png()
    .toBuffer();
}

const pad = (n) => Math.round((SIZE - n) / 2);

// 1. Светлая (основная): непрозрачный фон — обязателен для App Store
const markLight = await tintedMark(MARK, BRAND);
await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: BG_LIGHT } })
  .composite([{ input: markLight, top: pad(MARK), left: pad(MARK) }])
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(`${OUT}/ios-light.png`);

// 2. Тёмная: прозрачный фон — Apple подставляет системную подложку
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await tintedMark(MARK, BRAND_DARK), top: pad(MARK), left: pad(MARK) }])
  .png({ compressionLevel: 9 })
  .toFile(`${OUT}/ios-dark.png`);

// 3. Тонированная: Apple требует градации серого
await sharp(`${OUT}/ios-light.png`).greyscale().png({ compressionLevel: 9 }).toFile(`${OUT}/ios-tinted.png`);

// 4. Android: в адаптивной иконке безопасная зона — 66% холста
const ANDROID_MARK = Math.round(SIZE * 0.6);
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await tintedMark(ANDROID_MARK, BRAND), top: pad(ANDROID_MARK), left: pad(ANDROID_MARK) }])
  .png()
  .toFile(`${OUT}/android-foreground.png`);
await sharp(`${OUT}/android-foreground.png`).greyscale().png().toFile(`${OUT}/android-monochrome.png`);

// 5. Сплэш: только марка на прозрачном (фон задаёт плагин), и фавиконка для web
await sharp(await tintedMark(512, BRAND)).png().toFile("./assets/images/splash-icon.png");
await sharp(await tintedMark(196, BRAND))
  .resize(48, 48)
  .png()
  .toFile("./assets/images/favicon.png");

for (const f of ["ios-light", "ios-dark", "ios-tinted", "android-foreground", "android-monochrome"]) {
  const m = await sharp(`${OUT}/${f}.png`).metadata();
  console.log(`${f}.png  ${m.width}x${m.height}  каналов=${m.channels}  альфа=${m.hasAlpha}`);
}
