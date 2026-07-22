-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "evolmindError" TEXT,
ADD COLUMN     "evolmindSynced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "evolmindSyncedAt" TIMESTAMP(3),
ADD COLUMN     "syncAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
