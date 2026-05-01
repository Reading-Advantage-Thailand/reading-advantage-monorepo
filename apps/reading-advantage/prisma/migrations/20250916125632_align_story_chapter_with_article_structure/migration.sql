/*
  Warnings:

  - You are about to drop the column `content` on the `chapters` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chapters" DROP COLUMN "content",
ADD COLUMN     "audio_word_url" TEXT,
ADD COLUMN     "author_id" TEXT,
ADD COLUMN     "cefr_level" TEXT,
ADD COLUMN     "genre" TEXT,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passage" TEXT,
ADD COLUMN     "ra_level" INTEGER,
ADD COLUMN     "sub_genre" TEXT,
ADD COLUMN     "translated_passage" JSONB,
ADD COLUMN     "translated_summary" JSONB,
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "audio_word_url" TEXT,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sentences" JSONB,
ADD COLUMN     "translated_summary" JSONB,
ADD COLUMN     "words" JSONB;
