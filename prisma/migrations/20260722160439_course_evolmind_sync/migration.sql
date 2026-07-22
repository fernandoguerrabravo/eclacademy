-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "evolmindError" TEXT,
ADD COLUMN     "evolmindSynced" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "evolmindCourseId" DROP NOT NULL;
