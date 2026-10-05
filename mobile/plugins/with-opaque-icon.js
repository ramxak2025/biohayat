/**
 * Снимает альфа-канал со светлой App Store иконки прямо внутри prebuild.
 *
 * Зачем: @expo/image-utils вызывает ensureAlpha() и подкладывает фон через
 * composite, поэтому ветка flatten() никогда не срабатывает и на выходе всегда
 * 4 канала. App Store отклоняет такую иконку (ITMS-90717). Плагин работает и
 * локально, и в облаке EAS, не завися от порядка lifecycle-хуков.
 *
 * Тёмный вариант не трогаем — там прозрачность обязательна по требованию Apple.
 */
const { withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

module.exports = function withOpaqueIcon(config, { backgroundColor = "#f0f9f1" } = {}) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const sharp = require("sharp");
      const root = cfg.modRequest.platformProjectRoot;
      const dirs = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => path.join(root, d.name, "Images.xcassets/AppIcon.appiconset"))
        .filter((p) => fs.existsSync(p));

      for (const dir of dirs) {
        for (const name of fs.readdirSync(dir)) {
          if (!name.endsWith(".png") || name.includes("dark")) continue;
          const file = path.join(dir, name);
          const buf = await sharp(file)
            .flatten({ background: backgroundColor })
            .removeAlpha()
            .toColorspace("srgb")
            .png({ compressionLevel: 9 })
            .toBuffer();
          fs.writeFileSync(file, buf);
          console.log(`[with-opaque-icon] альфа убрана: ${name}`);
        }
      }
      return cfg;
    },
  ]);
};
