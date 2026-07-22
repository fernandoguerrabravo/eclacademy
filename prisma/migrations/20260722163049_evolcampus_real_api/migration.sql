/*
  Warnings:

  - The `evolmindCourseId` column on the `courses` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "evolmindGroupId" INTEGER,
DROP COLUMN "evolmindCourseId",
ADD COLUMN     "evolmindCourseId" INTEGER;

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "evolmindUserId" INTEGER,
ADD COLUMN     "studentName" TEXT;
