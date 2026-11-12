import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { copyRecoveryAssets, importRecovery, loadRecovery } from "./catalogue-recovery";

async function main() {
  const [directory, uploadsDirectory, mode] = process.argv.slice(2);
  if (!directory || !uploadsDirectory || (mode && mode !== "--dry-run")) {
    throw new Error("Usage: tsx scripts/import-recovered-catalogue.ts CAPTURE_DIR UPLOADS_DIR [--dry-run]");
  }
  const recovery = await loadRecovery(directory, path.join(import.meta.dirname, "catalogue-publication.json"));
  if (mode === "--dry-run") {
    console.log(JSON.stringify({ products: recovery.products.length, images: recovery.manifest.length,
      directions: Object.fromEntries(["sunna", "semya", "osnova", "sport"].map(direction => [direction, recovery.products.filter(p => p.published.direction === direction).length])),
      inStock: recovery.products.filter(p => p.product.inStock).length }));
    return;
  }
  const prisma = new PrismaClient();
  try {
    await copyRecoveryAssets(recovery, uploadsDirectory);
    console.log(JSON.stringify(await importRecovery(prisma, recovery)));
  } finally { await prisma.$disconnect(); }
}

main().catch(() => { console.error("Catalogue recovery failed; no order or operator data was overwritten. Inspect the source/DB privately."); process.exitCode = 1; });
