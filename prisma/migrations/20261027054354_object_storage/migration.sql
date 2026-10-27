-- AlterTable
ALTER TABLE "Document" DROP COLUMN "fileData",
ADD COLUMN     "storageKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

