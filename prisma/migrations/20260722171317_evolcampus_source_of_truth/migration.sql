-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subjects" JSONB;
