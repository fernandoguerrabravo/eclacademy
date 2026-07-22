-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "audience" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "whatYouLearn" TEXT[] DEFAULT ARRAY[]::TEXT[];
