/*
  Warnings:

  - You are about to drop the column `phoneE164` on the `SignupSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SignupSession" DROP COLUMN "phoneE164",
ADD COLUMN     "phone" TEXT;
