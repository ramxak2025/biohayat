/** Real pre-correction receipt + changed editorial map, on the isolated restored shop clone. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import path from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import { importRecovery, loadRecovery } from "./catalogue-recovery";

async function main() {
  assert.equal(process.env.ROLE_TEST_ALLOW, "1");
  const url = new URL(process.env.DATABASE_URL || "");
  assert.equal(url.hostname, "hayat-commerce-test-postgres"); assert.equal(url.pathname, "/hayat_role_shop_test");
  const prisma = new PrismaClient();
  const id = "recovered-wc-22589";
  const original = await prisma.product.findUniqueOrThrow({ where: { id } });
  const receipt = await prisma.catalogueRecovery.findUniqueOrThrow({ where: { sourceId: 22589 } });
  try {
    const recovery = await loadRecovery("/capture", path.join(import.meta.dirname, "catalogue-publication.json"));
    const revised = recovery.products.find(row => row.product.sourceId === 22589)!;
    assert.notEqual(revised.sourceHash, receipt.sourceHash, "Fixture must contain the original pre-correction receipt");
    await prisma.product.update({ where: { id }, data: { name: "SYNTHETIC OPERATOR EDIT", priceKopecks: original.priceKopecks + 7, volume: "SYNTHETIC OPERATOR VOLUME" } });
    const result = await importRecovery(prisma, recovery);
    assert.equal(result.imported, 0); assert.equal(result.preserved, 119);
    const retained = await prisma.product.findUniqueOrThrow({ where: { id } });
    assert.equal(retained.name, "SYNTHETIC OPERATOR EDIT"); assert.equal(retained.priceKopecks, original.priceKopecks + 7); assert.equal(retained.volume, "SYNTHETIC OPERATOR VOLUME");
    assert.deepEqual(await prisma.catalogueRecovery.findUniqueOrThrow({ where: { sourceId: 22589 } }), receipt);
    console.log("PASS changed publication with identical raw capture preserves operator fields and immutable original receipt across119 rows");
    const tampered = structuredClone(recovery);
    const row = tampered.products[0];
    const source = row.source as Prisma.InputJsonObject;
    row.source = { ...source, normalized: { ...(source.normalized as Prisma.InputJsonObject), priceKopecks: 1 } };
    row.sourceHash = createHash("sha256").update(JSON.stringify(row.source)).digest("hex");
    await assert.rejects(() => importRecovery(prisma, tampered), /Recovery source changed/);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id } })).priceKopecks, original.priceKopecks + 7);
    console.log("PASS altered raw price rejected without changing existing operator data");
  } finally {
    await prisma.product.update({ where: { id }, data: { name: original.name, priceKopecks: original.priceKopecks, volume: original.volume } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Publication replay verification failed"); process.exitCode = 1; });
