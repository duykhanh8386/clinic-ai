-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "specialty" TEXT;

-- CreateIndex
CREATE INDEX "Service_specialty_idx" ON "Service"("specialty");
