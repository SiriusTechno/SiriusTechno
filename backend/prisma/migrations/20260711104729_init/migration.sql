-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OwnershipStatus" AS ENUM ('OWNED', 'RENTED');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('LOGO', 'ISO_CERTIFICATE', 'BALANCE_SHEET', 'BANK_ATTESTATION', 'TAX_CLEARANCE', 'PROJECT_PHOTO', 'FINAL_ACCEPTANCE', 'GOOD_EXECUTION', 'PERSONNEL_PHOTO', 'CV', 'DIPLOMA', 'PERSONNEL_CERTIFICATE', 'EQUIPMENT_PHOTO', 'OWNERSHIP_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "ProfileSection" AS ENUM ('IDENTITY', 'FINANCES', 'EXPERIENCE', 'PERSONNEL', 'EQUIPMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "tradeRegisterNumber" TEXT,
    "nccNumber" TEXT,
    "headOfficeAddress" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoFileId" TEXT,
    "identityUpdatedAt" TIMESTAMP(3),
    "financesUpdatedAt" TIMESTAMP(3),
    "experienceUpdatedAt" TIMESTAMP(3),
    "equipmentUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsoCertification" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "certifyingBody" TEXT,
    "obtainedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "certificateFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsoCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialYear" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "revenue" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "balanceSheetFileId" TEXT,
    "bankAttestationFileId" TEXT,
    "taxClearanceFileId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceProject" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contractingAuthority" TEXT,
    "workType" TEXT,
    "amount" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "finalAcceptanceFileId" TEXT,
    "goodExecutionFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonnelMember" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "experienceSummary" TEXT,
    "photoFileId" TEXT,
    "cvFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonnelMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diploma" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "institution" TEXT,
    "year" INTEGER,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Diploma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonnelCertification" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuingBody" TEXT,
    "obtainedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonnelCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ownershipStatus" "OwnershipStatus" NOT NULL DEFAULT 'OWNED',
    "brand" TEXT,
    "model" TEXT,
    "capacity" TEXT,
    "acquisitionYear" INTEGER,
    "serialNumber" TEXT,
    "registrationNumber" TEXT,
    "photoFileId" TEXT,
    "ownershipProofFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "profileId" TEXT,
    "category" "FileCategory" NOT NULL DEFAULT 'OTHER',
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileChangeLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" "ProfileSection" NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_logoFileId_key" ON "CompanyProfile"("logoFileId");

-- CreateIndex
CREATE UNIQUE INDEX "IsoCertification_certificateFileId_key" ON "IsoCertification"("certificateFileId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialYear_balanceSheetFileId_key" ON "FinancialYear"("balanceSheetFileId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialYear_bankAttestationFileId_key" ON "FinancialYear"("bankAttestationFileId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialYear_taxClearanceFileId_key" ON "FinancialYear"("taxClearanceFileId");

-- CreateIndex
CREATE INDEX "FinancialYear_profileId_fiscalYear_isCurrent_idx" ON "FinancialYear"("profileId", "fiscalYear", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialYear_profileId_fiscalYear_version_key" ON "FinancialYear"("profileId", "fiscalYear", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceProject_finalAcceptanceFileId_key" ON "ReferenceProject"("finalAcceptanceFileId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceProject_goodExecutionFileId_key" ON "ReferenceProject"("goodExecutionFileId");

-- CreateIndex
CREATE INDEX "ReferenceProject_profileId_idx" ON "ReferenceProject"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPhoto_fileId_key" ON "ProjectPhoto"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonnelMember_photoFileId_key" ON "PersonnelMember"("photoFileId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonnelMember_cvFileId_key" ON "PersonnelMember"("cvFileId");

-- CreateIndex
CREATE INDEX "PersonnelMember_profileId_idx" ON "PersonnelMember"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Diploma_fileId_key" ON "Diploma"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonnelCertification_fileId_key" ON "PersonnelCertification"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentItem_photoFileId_key" ON "EquipmentItem"("photoFileId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentItem_ownershipProofFileId_key" ON "EquipmentItem"("ownershipProofFileId");

-- CreateIndex
CREATE INDEX "EquipmentItem_profileId_idx" ON "EquipmentItem"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_storageKey_key" ON "StoredFile"("storageKey");

-- CreateIndex
CREATE INDEX "StoredFile_profileId_idx" ON "StoredFile"("profileId");

-- CreateIndex
CREATE INDEX "ProfileChangeLog_profileId_createdAt_idx" ON "ProfileChangeLog"("profileId", "createdAt");

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsoCertification" ADD CONSTRAINT "IsoCertification_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsoCertification" ADD CONSTRAINT "IsoCertification_certificateFileId_fkey" FOREIGN KEY ("certificateFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialYear" ADD CONSTRAINT "FinancialYear_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialYear" ADD CONSTRAINT "FinancialYear_balanceSheetFileId_fkey" FOREIGN KEY ("balanceSheetFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialYear" ADD CONSTRAINT "FinancialYear_bankAttestationFileId_fkey" FOREIGN KEY ("bankAttestationFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialYear" ADD CONSTRAINT "FinancialYear_taxClearanceFileId_fkey" FOREIGN KEY ("taxClearanceFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceProject" ADD CONSTRAINT "ReferenceProject_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceProject" ADD CONSTRAINT "ReferenceProject_finalAcceptanceFileId_fkey" FOREIGN KEY ("finalAcceptanceFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceProject" ADD CONSTRAINT "ReferenceProject_goodExecutionFileId_fkey" FOREIGN KEY ("goodExecutionFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReferenceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelMember" ADD CONSTRAINT "PersonnelMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelMember" ADD CONSTRAINT "PersonnelMember_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelMember" ADD CONSTRAINT "PersonnelMember_cvFileId_fkey" FOREIGN KEY ("cvFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diploma" ADD CONSTRAINT "Diploma_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "PersonnelMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diploma" ADD CONSTRAINT "Diploma_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelCertification" ADD CONSTRAINT "PersonnelCertification_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "PersonnelMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelCertification" ADD CONSTRAINT "PersonnelCertification_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentItem" ADD CONSTRAINT "EquipmentItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentItem" ADD CONSTRAINT "EquipmentItem_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentItem" ADD CONSTRAINT "EquipmentItem_ownershipProofFileId_fkey" FOREIGN KEY ("ownershipProofFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileChangeLog" ADD CONSTRAINT "ProfileChangeLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileChangeLog" ADD CONSTRAINT "ProfileChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
