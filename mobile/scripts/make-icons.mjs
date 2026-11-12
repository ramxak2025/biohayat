/** Собирает иконки и сплэш из альфа-маски оригинального знака ХАЯТ. */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../assets/brand/logo-mark.png", import.meta.url));
const OUT = fileURLToPath(new URL("../assets/icon", import.meta.url));
const IMAGES = fileURLToPath(new URL("../assets/images", import.meta.url));
const SIZE = 1024;
const MARK = Math.round(SIZE * 0.68); // 68% — рекомендация HIG для круглой марки
const INK = "#0F1D16";
const SAGE = "#B3C3A6";
const MIST = "#EEF1EA";

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
const markLight = await tintedMark(MARK, INK);
await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: MIST } })
  .composite([{ input: markLight, top: pad(MARK), left: pad(MARK) }])
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(`${OUT}/ios-light.png`);

// 2. Тёмная: прозрачный фон — Apple подставляет системную подложку
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await tintedMark(MARK, SAGE), top: pad(MARK), left: pad(MARK) }])
  .png({ compressionLevel: 9 })
  .toFile(`${OUT}/ios-dark.png`);

// 3. Тонированная: Apple требует градации серого
await sharp(`${OUT}/ios-light.png`).greyscale().png({ compressionLevel: 9 }).toFile(`${OUT}/ios-tinted.png`);

// 4. Android: в адаптивной иконке безопасная зона — 66% холста
const ANDROID_MARK = Math.round(SIZE * 0.6);
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await tintedMark(ANDROID_MARK, INK), top: pad(ANDROID_MARK), left: pad(ANDROID_MARK) }])
  .png()
  .toFile(`${OUT}/android-foreground.png`);
await sharp(`${OUT}/android-foreground.png`).greyscale().png().toFile(`${OUT}/android-monochrome.png`);

// 5. Сплэш: только марка на прозрачном (фон задаёт плагин), и фавиконка для web
await sharp(await tintedMark(512, INK)).png().toFile(`${IMAGES}/splash-icon.png`);
await sharp(await tintedMark(512, SAGE)).png().toFile(`${IMAGES}/splash-icon-dark.png`);
await sharp(await tintedMark(196, INK))
  .resize(48, 48)
  .png()
  .toFile(`${IMAGES}/favicon.png`);

for (const f of ["ios-light", "ios-dark", "ios-tinted", "android-foreground", "android-monochrome"]) {
  const m = await sharp(`${OUT}/${f}.png`).metadata();
  console.log(`${f}.png  ${m.width}x${m.height}  каналов=${m.channels}  альфа=${m.hasAlpha}`);
}
