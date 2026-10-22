-- Additive only. No consent is fabricated/backfilled for historical accounts.
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "registrationConsent" JSONB;
