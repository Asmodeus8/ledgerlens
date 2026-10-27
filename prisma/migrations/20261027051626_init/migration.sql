-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documentType" TEXT,
    "vendorName" TEXT,
    "documentNumber" TEXT,
    "issueDate" DATE,
    "dueDate" DATE,
    "currency" TEXT,
    "subtotal" DECIMAL(14,2),
    "tax" DECIMAL(14,2),
    "total" DECIMAL(14,2),
    "category" TEXT,
    "warnings" TEXT[],
    "reviewed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineItem" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,3),
    "unitPrice" DECIMAL(14,2),
    "amount" DECIMAL(14,2),

    CONSTRAINT "LineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- CreateIndex
CREATE INDEX "Document_issueDate_idx" ON "Document"("issueDate");

-- CreateIndex
CREATE INDEX "LineItem_documentId_idx" ON "LineItem"("documentId");

-- AddForeignKey
ALTER TABLE "LineItem" ADD CONSTRAINT "LineItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
