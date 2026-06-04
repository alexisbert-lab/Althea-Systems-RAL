-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificationExp" TIMESTAMP(3),
ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "pendingEmailExp" TIMESTAMP(3),
ADD COLUMN     "pendingEmailToken" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;
