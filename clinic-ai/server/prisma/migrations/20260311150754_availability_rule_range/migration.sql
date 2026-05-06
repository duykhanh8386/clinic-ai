/*
  Warnings:

  - You are about to drop the column `doctorId` on the `AvailabilityRule` table. All the data in the column will be lost.
  - Added the required column `rangeId` to the `AvailabilityRule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AvailabilityRule" DROP CONSTRAINT "AvailabilityRule_doctorId_fkey";

-- DropIndex
DROP INDEX "AvailabilityRule_doctorId_dayOfWeek_idx";

-- AlterTable
ALTER TABLE "AvailabilityRule" DROP COLUMN "doctorId",
ADD COLUMN     "rangeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Slot" ADD COLUMN     "availabilityRangeId" TEXT;

-- CreateTable
CREATE TABLE "AvailabilityRange" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "title" TEXT,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilityRange_doctorId_fromDate_toDate_idx" ON "AvailabilityRange"("doctorId", "fromDate", "toDate");

-- CreateIndex
CREATE INDEX "AvailabilityRule_rangeId_dayOfWeek_idx" ON "AvailabilityRule"("rangeId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Slot_availabilityRangeId_startAt_idx" ON "Slot"("availabilityRangeId", "startAt");

-- AddForeignKey
ALTER TABLE "AvailabilityRange" ADD CONSTRAINT "AvailabilityRange_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_rangeId_fkey" FOREIGN KEY ("rangeId") REFERENCES "AvailabilityRange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_availabilityRangeId_fkey" FOREIGN KEY ("availabilityRangeId") REFERENCES "AvailabilityRange"("id") ON DELETE SET NULL ON UPDATE CASCADE;
