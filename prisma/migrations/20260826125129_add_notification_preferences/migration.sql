-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "lastNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "notificationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notificationPrefs" JSONB;
