-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- Backfill specialties from existing doctor/service specialty names.
WITH "SpecialtyNames" AS (
    SELECT DISTINCT trim("specialty") AS "name"
    FROM "DoctorProfile"
    WHERE "specialty" IS NOT NULL AND trim("specialty") <> ''
    UNION
    SELECT DISTINCT trim("specialty") AS "name"
    FROM "Service"
    WHERE "specialty" IS NOT NULL AND trim("specialty") <> ''
)
INSERT INTO "Specialty" ("id", "name", "createdAt", "updatedAt")
SELECT 'spec_' || md5("name"), "name", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "SpecialtyNames";

-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN "specialtyId" TEXT;
ALTER TABLE "Service" ADD COLUMN "specialtyId" TEXT;

-- Backfill relation columns.
UPDATE "DoctorProfile"
SET "specialtyId" = "Specialty"."id"
FROM "Specialty"
WHERE trim("DoctorProfile"."specialty") = "Specialty"."name";

UPDATE "Service"
SET "specialtyId" = "Specialty"."id"
FROM "Specialty"
WHERE "Service"."specialty" IS NOT NULL
  AND trim("Service"."specialty") = "Specialty"."name";

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_name_key" ON "Specialty"("name");
CREATE INDEX "Specialty_name_idx" ON "Specialty"("name");
CREATE INDEX "DoctorProfile_specialtyId_idx" ON "DoctorProfile"("specialtyId");
CREATE INDEX "Service_specialtyId_idx" ON "Service"("specialtyId");

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
