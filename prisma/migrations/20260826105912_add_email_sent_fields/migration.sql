-- AlterTable
ALTER TABLE "NotificationSend" ADD COLUMN     "emailError" TEXT,
ADD COLUMN     "emailSent" BOOLEAN NOT NULL DEFAULT false;
