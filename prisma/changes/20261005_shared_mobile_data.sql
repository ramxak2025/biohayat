-- Additive migration from live commit 6db05438. Run once after a database backup.
BEGIN;
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "clientRequestKey" TEXT,
ADD COLUMN     "inventoryVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requestHash" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "stockReserved" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CustomerAddress" ADD COLUMN     "apartment" TEXT,
ADD COLUMN     "comment" TEXT,
ADD COLUMN     "house" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "recipient" TEXT;

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "appVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_pushToken_key" ON "Device"("pushToken");

-- CreateIndex
CREATE INDEX "Device_customerId_idx" ON "Device"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_clientRequestKey_key" ON "Order"("clientRequestKey");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
