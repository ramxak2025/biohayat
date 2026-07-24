/**
 * Импорт фотографий товаров со старого сайта biohayat.ru на новый.
 *
 * Что делает:
 *  1. Берёт соответствие «slug → ссылки на фото» из prisma/seed-data/legacy-images.ts
 *     (составлено сопоставлением каталогов; см. комментарий в том файле).
 *  2. Для каждого товара скачивает фото, конвертирует в WebP (sharp) и сохраняет
 *     в public/uploads/legacy/ — то есть на ХОСТИНГ нового сайта, чтобы не зависеть
 *     от старого сайта (он может быть отключён).
 *  3. Создаёт записи ProductImage со ссылкой /uploads/legacy/<slug>-<n>.webp.
 *
 * Идемпотентность: по умолчанию пропускает товары, у которых уже есть изображения.
 * Флаги:
 *   --force   пересоздать изображения даже если они уже есть (старые ProductImage удаляются)
 *   --dry     ничего не писать, только показать план
 *   --limit=N обработать только первые N товаров (для проверки)
 *
 * Запуск на сервере (внутри контейнера app, где смонтирован том uploads):
 *   docker compose exec -T app pnpm tsx scripts/import-legacy-photos.ts
 * Локально:
 *   pnpm tsx scripts/import-legacy-photos.ts --dry
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { legacyImages } from "../prisma/seed-data/legacy-images";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DRY = args.includes("--dry");
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0);

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "legacy");
const MAX_PER_PRODUCT = 4;

async function downloadWebp(url: string, outPath: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (biohayat-migration)" } });
    if (!res.ok) {
      console.warn(`   ✗ ${res.status} ${url}`);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) {
      console.warn(`   ✗ не изображение: ${url}`);
      return false;
    }
    await sharp(buf)
      .rotate()
      .resize({ width: 1400, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);
    return true;
  } catch (e) {
    console.warn(`   ✗ ошибка загрузки ${url}: ${(e as Error).message}`);
    return false;
  }
}

async function main() {
  const entries = Object.entries(legacyImages).filter(([, urls]) => urls.length > 0);
  const slice = LIMIT > 0 ? entries.slice(0, LIMIT) : entries;
  console.log(
    `🖼  Импорт фото: ${slice.length} товаров${DRY ? " (dry-run)" : ""}${FORCE ? " (force)" : ""}\n`,
  );
  if (!DRY) await mkdir(UPLOAD_DIR, { recursive: true });

  let done = 0;
  let skipped = 0;
  let missing = 0;
  let images = 0;

  for (const [slug, urls] of slice) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { images: true },
    });
    if (!product) {
      console.warn(`• ${slug}: товар не найден в базе — пропуск`);
      missing++;
      continue;
    }
    if (product.images.length > 0 && !FORCE) {
      skipped++;
      continue;
    }

    const picked = urls.slice(0, MAX_PER_PRODUCT);
    console.log(`• ${product.name}  (${picked.length} фото)`);
    if (DRY) {
      picked.forEach((u) => console.log(`   → ${u}`));
      done++;
      continue;
    }

    if (FORCE && product.images.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
    }

    let order = 0;
    for (const url of picked) {
      const filename = `${slug}-${order + 1}.webp`;
      const ok = await downloadWebp(url, path.join(UPLOAD_DIR, filename));
      if (!ok) continue;
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: `/uploads/legacy/${filename}`,
          alt: product.name,
          sortOrder: order,
        },
      });
      order++;
      images++;
    }
    if (order > 0) done++;
  }

  console.log(
    `\n✅ Готово. Обработано: ${done} | уже с фото (пропущено): ${skipped} | не найдено в базе: ${missing} | добавлено изображений: ${images}`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
