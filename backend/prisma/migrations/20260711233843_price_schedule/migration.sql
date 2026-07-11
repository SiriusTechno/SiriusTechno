-- DropForeignKey
ALTER TABLE "Deliverable" DROP CONSTRAINT "Deliverable_matchingReportId_fkey";

-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN     "priceScheduleId" TEXT,
ALTER COLUMN "matchingReportId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PriceSchedule" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "totalExclTax" DECIMAL(18,2) NOT NULL,
    "taxRate" DECIMAL(5,4) NOT NULL,
    "taxAmount" DECIMAL(18,2) NOT NULL,
    "totalInclTax" DECIMAL(18,2) NOT NULL,
    "sourceFileId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceSchedule_sourceFileId_key" ON "PriceSchedule"("sourceFileId");

-- CreateIndex
CREATE INDEX "PriceSchedule_tenderId_isCurrent_idx" ON "PriceSchedule"("tenderId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "PriceSchedule_tenderId_version_key" ON "PriceSchedule"("tenderId", "version");

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_matchingReportId_fkey" FOREIGN KEY ("matchingReportId") REFERENCES "MatchingReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_priceScheduleId_fkey" FOREIGN KEY ("priceScheduleId") REFERENCES "PriceSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSchedule" ADD CONSTRAINT "PriceSchedule_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSchedule" ADD CONSTRAINT "PriceSchedule_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSchedule" ADD CONSTRAINT "PriceSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
