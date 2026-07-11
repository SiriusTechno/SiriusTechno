/*
  Warnings:

  - Added the required column `updatedAt` to the `Deliverable` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN     "editedByUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
