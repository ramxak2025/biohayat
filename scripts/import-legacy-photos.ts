/**
 * Привязка фотографий товаров к каталогу нового сайта.
 *
 * Фотографии перенесены со старого сайта biohayat.ru (WordPress/WooCommerce),
 * сконвертированы в WebP и лежат в РЕПОЗИТОРИИ в public/legacy/ — то есть
 * запекаются прямо в Docker-образ при сборке и раздаются как любая статика
 * (в отличие от public/uploads, который смонтирован как том и на некоторых
 * серверах отдаётся некорректно). Никакого скачивания на сервере не требуется.
 *
 * Скрипт лишь создаёт записи ProductImage со ссылками /legacy/<slug>-<n>.webp.
 * Соответствие «slug → файлы» — в prisma/seed-data/legacy-images.ts.
 *
 * Идемпотентность: по умолчанию пропускает товары, у которых уже есть изображения.
 * Флаги:
 *   --force   пересоздать (старые ProductImage удаляются)
 *   --dry     ничего не писать, показать план
 *
 * Запуск на сервере:
 *   docker compose exec -T app pnpm db:import-photos
 */
import { PrismaClient } from "@prisma/client";
import { legacyImages } from "../prisma/seed-data/legacy-images";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DRY = args.includes("--dry");

async function main() {
  const entries = Object.entries(legacyImages).filter(([, urls]) => urls.length > 0);
  console.log(`🖼  Привязка фото: ${entries.length} товаров${DRY ? " (dry-run)" : ""}${FORCE ? " (force)" : ""}\n`);

  let done = 0;
  let skipped = 0;
  let missing = 0;
  let images = 0;

  for (const [slug, urls] of entries) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { images: true },
    });
    if (!product) {
      console.warn(`• ${slug}: товар не найден — пропуск`);
      missing++;
      continue;
    }
    if (product.images.length > 0 && !FORCE) {
      skipped++;
      continue;
    }
    if (DRY) {
      console.log(`• ${product.name}: ${urls.length} фото`);
      done++;
      continue;
    }
    if (FORCE && product.images.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
    }
    await prisma.productImage.createMany({
      data: urls.map((url, i) => ({
        productId: product.id,
        url,
        alt: product.name,
        sortOrder: i,
      })),
    });
    images += urls.length;
    done++;
  }

  console.log(
    `\n✅ Готово. Привязано товаров: ${done} | уже с фото (пропущено): ${skipped} | не найдено: ${missing} | изображений: ${images}`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
