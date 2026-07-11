-- CreateEnum
CREATE TYPE "TenderStatus" AS ENUM ('UPLOADED', 'TEXT_EXTRACTED', 'NEEDS_OCR', 'GRID_READY', 'FAILED');

-- AlterEnum
ALTER TYPE "FileCategory" ADD VALUE 'TENDER_DOCUMENT';

-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT,
    "status" "TenderStatus" NOT NULL DEFAULT 'UPLOADED',
    "sourceFileId" TEXT NOT NULL,
    "extractedText" TEXT,
    "textCharCount" INTEGER,
    "pageCount" INTEGER,
    "extractionError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceGrid" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "originalData" JSONB NOT NULL,
    "editedByUser" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceGrid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tender_sourceFileId_key" ON "Tender"("sourceFileId");

-- CreateIndex
CREATE INDEX "Tender_profileId_idx" ON "Tender"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceGrid_tenderId_key" ON "ComplianceGrid"("tenderId");

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceGrid" ADD CONSTRAINT "ComplianceGrid_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
