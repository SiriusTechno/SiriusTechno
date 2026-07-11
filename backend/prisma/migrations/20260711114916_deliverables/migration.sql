-- CreateEnum
CREATE TYPE "DeliverableType" AS ENUM ('ANALYSIS', 'TECHNICAL_PROPOSAL', 'COMMERCIAL_PROPOSAL');

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "type" "DeliverableType" NOT NULL,
    "matchingReportId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "markdown" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deliverable_tenderId_type_createdAt_idx" ON "Deliverable"("tenderId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_matchingReportId_fkey" FOREIGN KEY ("matchingReportId") REFERENCES "MatchingReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
