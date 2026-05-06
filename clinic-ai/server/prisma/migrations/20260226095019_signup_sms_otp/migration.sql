-- CreateEnum
CREATE TYPE "SignupStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateTable
CREATE TABLE "SignupSession" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "SignupStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignupOtpCode" (
    "id" TEXT NOT NULL,
    "signupId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupOtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignupSession_expiresAt_idx" ON "SignupSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SignupSession_email_key" ON "SignupSession"("email");

-- CreateIndex
CREATE INDEX "SignupOtpCode_signupId_createdAt_idx" ON "SignupOtpCode"("signupId", "createdAt");

-- AddForeignKey
ALTER TABLE "SignupOtpCode" ADD CONSTRAINT "SignupOtpCode_signupId_fkey" FOREIGN KEY ("signupId") REFERENCES "SignupSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
