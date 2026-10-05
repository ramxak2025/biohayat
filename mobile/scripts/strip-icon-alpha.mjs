/**
 * App Store отклоняет иконку с альфа-каналом (ITMS-90717), а `expo prebuild`
 * добавляет альфу ВСЕГДА: @expo/image-utils вызывает ensureAlpha() и подкладывает
 * фон через composite, из-за чего ветка flatten() никогда не выполняется.
 * Поэтому после prebuild схлопываем альфу у светлой иконки.
 * Тёмный вариант не трогаем — там прозрачность обязательна по требованию Apple.
 */
import sharp from "sharp";
import { globSync } from "glob";

const files = globSync("ios/*/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png");
if (!files.length) console.warn("иконка не найдена — prebuild ещё не выполнялся?");

for (const f of files) {
  const buf = await sharp(f).flatten({ background: "#f0f9f1" }).removeAlpha()
    .toColorspace("srgb").png({ compressionLevel: 9 }).toBuffer();
  await sharp(buf).toFile(f);
  const m = await sharp(f).metadata();
  console.log(`альфа убрана: ${f} → каналов=${m.channels}`);
}
