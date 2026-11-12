-- Additive migration. Existing products retain their IDs and receive osnova.
-- Rollback: deploy previous application without removing these columns/receipts.
-- Dropping recovery receipts would defeat the no-resurrection import guarantee.
DO $$ BEGIN
  CREATE TYPE "ProductDirection" AS ENUM ('sunna', 'semya', 'osnova', 'sport');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "direction" "ProductDirection" NOT NULL DEFAULT 'osnova';
CREATE INDEX IF NOT EXISTS "Product_direction_isActive_sortOrder_idx" ON "Product"("direction", "isActive", "sortOrder");
CREATE TABLE IF NOT EXISTS "CatalogueRecovery" (
  "sourceId" INTEGER PRIMARY KEY,
  "productId" TEXT NOT NULL UNIQUE,
  "sourceHash" TEXT NOT NULL,
  "source" JSONB NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
