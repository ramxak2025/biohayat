-- All status writers, including old mobile/admin code, advance the same revision.
-- Keep additive columns/receipts/triggers when rolling application code back.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "statusRevision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WholesaleOrder" ADD COLUMN IF NOT EXISTS "statusRevision" INTEGER NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION hayat_order_status_revision() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW."statusRevision" := OLD."statusRevision" + 1;
  ELSE
    NEW."statusRevision" := OLD."statusRevision";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER hayat_order_revision BEFORE UPDATE ON "Order"
  FOR EACH ROW EXECUTE FUNCTION hayat_order_status_revision();
CREATE OR REPLACE TRIGGER hayat_wholesale_revision BEFORE UPDATE ON "WholesaleOrder"
  FOR EACH ROW EXECUTE FUNCTION hayat_order_status_revision();
CREATE TABLE IF NOT EXISTS "CrmStatusReceipt" (
  "eventId" TEXT PRIMARY KEY,
  "requestHash" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
