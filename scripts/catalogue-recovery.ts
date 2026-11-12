import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import { productDirectionSchema } from "../src/lib/product-direction";

const money = z.number().int().min(0).max(2_147_483_647);
const categorySchema = z.object({ id: z.number().int().positive(), slug: z.string().min(1), name: z.string().min(1) });
const productSchema = z.object({
  sourceId: z.number().int().positive(), slug: z.string().min(1), name: z.string().min(1),
  sourceUrl: z.url(), sku: z.string().nullable(), priceKopecks: money,
  regularPriceKopecks: money.nullable(), salePriceKopecks: money.nullable(),
  currency: z.literal("RUB"), inStock: z.boolean(), categories: z.array(categorySchema),
  descriptionHtml: z.string(), shortDescriptionHtml: z.string(),
  images: z.array(z.object({ src: z.url(), alt: z.string().optional() })).min(1),
});
const manifestSchema = z.array(z.object({
  source: z.url(), path: z.string().regex(/^images\/[a-f0-9]+\.(?:jpg|jpeg|png|webp)$/),
  bytes: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
}));
const publicationSchema = z.array(z.object({
  sourceId: z.number().int().positive(), name: z.string().min(1),
  direction: productDirectionSchema, rationale: z.string().min(1),
  categorySlug: z.string().min(1), categoryName: z.string().min(1), description: z.string().min(1),
  volume: z.string().nullable(),
}));
const sha256 = (input: string | Buffer) => createHash("sha256").update(input).digest("hex");
const idFor = (sourceId: number) => `recovered-wc-${sourceId}`;
const SAFE_FORMATS = new Set(["balzam", "zhidkosti", "masla", "myod", "mylo", "myagkie-zhelatinovye-kapsuly",
  "pasta", "semena-i-travy", "siropy", "suppozitorii", "tabletki", "tverdye-zhelatinovye-kapsuly"]);
const unique = (values: readonly unknown[]) => new Set(values).size === values.length;
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key: string, nested: unknown): unknown =>
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? Object.fromEntries(Object.entries(nested).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : nested);
}

/** Editorial map updates apply only to new rows. An old receipt remains immutable;
 * rebuild its original input with its original publication and require every raw value
 * plus its original full hash to match. Changed prices/source/images still fail closed. */
function assertReplaySource(receipt: { source: Prisma.JsonValue; sourceHash: string }, source: Prisma.InputJsonValue) {
  assert(source && typeof source === "object" && !Array.isArray(source), "Invalid recovery source");
  assert(receipt.source && typeof receipt.source === "object" && !Array.isArray(receipt.source), "Invalid recovery receipt");
  const historical = { ...source, publication: publicationSchema.element.parse(receipt.source.publication) };
  assert(sha256(JSON.stringify(historical)) === receipt.sourceHash && canonicalJson(historical) === canonicalJson(receipt.source), "Recovery source changed; explicit reconciliation required");
}

/** All untrusted recovery files are checked before copying assets or opening a DB transaction. */
export async function loadRecovery(directory: string, publicationFile: string) {
  const read = async (file: string): Promise<unknown> => JSON.parse(await readFile(path.join(directory, file), "utf8"));
  const [productsJson, categoriesJson, manifestJson, rawJson, captureJson, publicationJson] = await Promise.all([
    read("products.json"), read("categories-source.json"), read("images-manifest.json"),
    read("products-source.json"), read("capture.json"),
    readFile(publicationFile, "utf8").then((value): unknown => JSON.parse(value)),
  ]);
  const products = z.array(productSchema).length(119).parse(productsJson);
  const categories = z.array(categorySchema.extend({ parent: z.number().int().nonnegative() })).parse(categoriesJson);
  const manifest = manifestSchema.length(225).parse(manifestJson);
  const publication = publicationSchema.length(119).parse(publicationJson);
  const raw = z.array(z.record(z.string(), z.json())).length(119).parse(rawJson);
  const capture = z.object({
    actualProducts: z.literal(119), downloadedImages: z.literal(225), imagesComplete: z.literal(true),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).parse(captureJson);
  assert(sha256(await readFile(path.join(directory, "products-source.json"))) === capture.sourceSha256, "Source archive checksum mismatch");
  assert(unique(products.map(p => p.sourceId)) && unique(products.map(p => p.slug)), "Duplicate product identity");
  assert(unique(publication.map(p => p.sourceId)) && unique(raw.map(p => p.id)), "Duplicate publication/raw identity");
  assert(unique(categories.map(c => c.id)) && unique(categories.map(c => c.slug)), "Duplicate category identity");
  assert(unique(manifest.map(i => i.source)) && unique(manifest.map(i => i.path)), "Duplicate image identity");
  assert(products.filter(p => p.inStock).length === 108, "Recovered availability differs from 108 in / 11 out");
  const categoryIds = new Set(categories.map(c => c.id));
  for (const category of categories) {
    assert(!category.parent || categoryIds.has(category.parent), "Missing category parent");
    const seen = new Set<number>();
    let current: typeof category | undefined = category;
    while (current) {
      assert(!seen.has(current.id), "Category cycle"); seen.add(current.id);
      current = categories.find(c => c.id === current?.parent);
    }
  }
  for (const image of manifest) {
    const bytes = await readFile(path.join(directory, image.path));
    assert(bytes.length === image.bytes && sha256(bytes) === image.sha256, `Image checksum mismatch: ${image.path}`);
  }
  const publications = new Map(publication.map(p => [p.sourceId, p]));
  const originals = new Map(raw.map(p => [p.id, p]));
  const images = new Map(manifest.map(i => [i.source, i]));
  const prepared = products.map(product => {
    const published = publications.get(product.sourceId);
    const original = originals.get(product.sourceId);
    assert(published && original, `Missing publication/raw record: ${product.sourceId}`);
    assert(product.categories.every(c => categoryIds.has(c.id)), "Unknown product category");
    const mappedImages = product.images.map(image => {
      const asset = images.get(image.src);
      assert(asset, `Missing image: ${product.sourceId}`);
      return { url: `/uploads/recovered/${path.basename(asset.path)}`, alt: published.name };
    });
    const source = JSON.parse(JSON.stringify({
      capture: captureJson, normalized: (productsJson as unknown[])[products.indexOf(product)],
      original, publication: published, categoryArchive: categoriesJson,
      images: product.images.map(i => images.get(i.src)),
    })) as Prisma.InputJsonValue;
    return { product, published, mappedImages, source, sourceHash: sha256(JSON.stringify(source)) };
  });
  return { directory, products: prepared, categories, manifest };
}

export type Recovery = Awaited<ReturnType<typeof loadRecovery>>;

/** Content-addressed, create-only files. A retry verifies existing bytes; it never replaces them. */
export async function copyRecoveryAssets(recovery: Recovery, uploadsDirectory: string) {
  const destination = path.join(uploadsDirectory, "recovered");
  await mkdir(destination, { recursive: true });
  for (const asset of recovery.manifest) {
    const target = path.join(destination, path.basename(asset.path));
    try { await copyFile(path.join(recovery.directory, asset.path), target, constants.COPYFILE_EXCL); }
    catch (error) { if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error; }
    assert(sha256(await readFile(target)) === asset.sha256, `Existing asset differs: ${asset.path}`);
  }
}

/**
 * Create-only recovery under one database lock. An immutable receipt survives deletion;
 * retries preserve operator edits, order snapshots, stock movements and deleted products.
 * A changed source/publication file is an explicit reconciliation task, never an overwrite.
 */
export async function importRecovery(prisma: PrismaClient, recovery: Recovery) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721112119)`;
    let imported = 0;
    let preserved = 0;
    const categoryMap = new Map<string, string>();
    const parent = await tx.category.upsert({ where: { slug: "3-forma-produktsii" }, update: {},
      create: { id: idFor(180), slug: "3-forma-produktsii", name: "Форма выпуска" } });
    for (const { published } of recovery.products) {
      if (categoryMap.has(published.categorySlug)) continue;
      const sourceCategory = recovery.categories.find(c => c.slug === published.categorySlug && SAFE_FORMATS.has(c.slug));
      assert(sourceCategory || published.categorySlug === "other-products", "Only safe format categories may be published");
      const row = await tx.category.upsert({
        where: { slug: published.categorySlug }, update: {},
        create: { id: sourceCategory ? idFor(sourceCategory.id) : "recovered-other-products", slug: published.categorySlug,
          name: published.categoryName, parentId: parent.id },
      });
      categoryMap.set(published.categorySlug, row.id);
    }
    for (const { product, published, mappedImages, source, sourceHash } of recovery.products) {
      const receipt = await tx.catalogueRecovery.findUnique({ where: { sourceId: product.sourceId } });
      if (receipt) {
        if (receipt.sourceHash !== sourceHash) assertReplaySource(receipt, source);
        preserved++; continue;
      }
      const id = idFor(product.sourceId);
      await tx.product.create({ data: {
        id, slug: product.slug, name: published.name, direction: published.direction,
        categoryId: categoryMap.get(published.categorySlug)!, sku: product.sku || null,
        priceKopecks: product.priceKopecks,
        oldPriceKopecks: product.regularPriceKopecks !== null && product.regularPriceKopecks > product.priceKopecks ? product.regularPriceKopecks : null,
        inStock: product.inStock, stockQty: null, isActive: true,
        // The old marketing copy is archived above, not promoted to verified composition or doses.
        description: published.description,
        volume: published.volume,
        badges: [], nutrients: [], goals: [],
        audiences: product.categories.flatMap(c => c.slug === "dlya-detey" ? ["kids"] : c.slug === "dlya-zhenschin" ? ["women"] : c.slug === "dlya-muzhchin" ? ["men"] : []),
        images: { create: mappedImages.map((image, sortOrder) => ({ ...image, sortOrder })) },
      } });
      await tx.catalogueRecovery.create({ data: { sourceId: product.sourceId, productId: id, sourceHash, source } });
      imported++;
    }
    return { imported, preserved, imagesVerified: recovery.manifest.length };
  }, { timeout: 120_000, maxWait: 15_000 });
}
