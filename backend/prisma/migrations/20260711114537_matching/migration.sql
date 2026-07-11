-- CreateTable
CREATE TABLE "MatchingReport" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "gridSnapshot" JSONB NOT NULL,
    "profileSnapshot" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchingReport_tenderId_createdAt_idx" ON "MatchingReport"("tenderId", "createdAt");

-- AddForeignKey
ALTER TABLE "MatchingReport" ADD CONSTRAINT "MatchingReport_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingReport" ADD CONSTRAINT "MatchingReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
