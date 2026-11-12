-- Additive only. Apply before deploying code that reads crmProvider/CrmOutbox.
-- Do not run against production without separate authorization and a backup.
BEGIN;
DO $$ BEGIN
  CREATE TYPE "CrmProvider" AS ENUM ('LEGACY', 'HAYAT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "CrmDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY', 'DELIVERED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "crmProvider" "CrmProvider" NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "ConsultationRequest" ADD COLUMN IF NOT EXISTS "crmProvider" "CrmProvider" NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "WholesaleOrder" ADD COLUMN IF NOT EXISTS "crmProvider" "CrmProvider" NOT NULL DEFAULT 'LEGACY';

CREATE TABLE IF NOT EXISTS "CrmOutbox" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" "CrmProvider" NOT NULL DEFAULT 'HAYAT',
  "kind" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "status" "CrmDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "lastError" TEXT,
  "crmDealId" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "CrmOutbox_kind_externalId_key" ON "CrmOutbox"("kind", "externalId");
CREATE INDEX IF NOT EXISTS "CrmOutbox_status_nextAttemptAt_idx" ON "CrmOutbox"("status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "CrmOutbox_status_leaseExpiresAt_idx" ON "CrmOutbox"("status", "leaseExpiresAt");
COMMIT;
