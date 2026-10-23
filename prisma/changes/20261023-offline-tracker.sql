-- Additive protocol fields. Historical log days and legacy schedule semantics are not rewritten.
ALTER TABLE "IntakePlan" ADD COLUMN IF NOT EXISTS "anchorDay" TEXT;
ALTER TABLE "IntakePlan" ADD COLUMN IF NOT EXISTS "intervalDays" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "IntakePlan" ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "IntakePlan" ADD COLUMN IF NOT EXISTS "scheduleVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "IntakeLog" ADD COLUMN IF NOT EXISTS "taken" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "IntakeLog" ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS "IntakeMutation" (
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "operationId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("customerId", "operationId")
);
CREATE INDEX IF NOT EXISTS "IntakeMutation_customerId_planId_action_idx" ON "IntakeMutation"("customerId", "planId", "action");
