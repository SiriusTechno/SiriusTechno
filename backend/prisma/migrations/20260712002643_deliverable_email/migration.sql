-- CreateTable
CREATE TABLE "DeliverableEmail" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "deliverableIds" TEXT[],
    "recipients" TEXT[],
    "cc" TEXT[],
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverableEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliverableEmail_tenderId_createdAt_idx" ON "DeliverableEmail"("tenderId", "createdAt");

-- AddForeignKey
ALTER TABLE "DeliverableEmail" ADD CONSTRAINT "DeliverableEmail_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableEmail" ADD CONSTRAINT "DeliverableEmail_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
