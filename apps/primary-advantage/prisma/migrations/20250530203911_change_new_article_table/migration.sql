/*
  Warnings:

  - You are about to drop the `Article` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LongAnswerQuestion" DROP CONSTRAINT "LongAnswerQuestion_article_id_fkey";

-- DropForeignKey
ALTER TABLE "MultipleChoiceQuestion" DROP CONSTRAINT "MultipleChoiceQuestion_article_id_fkey";

-- DropForeignKey
ALTER TABLE "ShortAnswerQuestion" DROP CONSTRAINT "ShortAnswerQuestion_article_id_fkey";

-- DropForeignKey
ALTER TABLE "WordList" DROP CONSTRAINT "WordList_article_id_fkey";

-- DropTable
DROP TABLE "Article";

-- CreateTable
CREATE TABLE "article" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "sub_genre" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "passage" TEXT NOT NULL,
    "image_description" TEXT NOT NULL,
    "cefr_level" TEXT NOT NULL,
    "ra_level" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "audio_url" TEXT,
    "audio_word_url" TEXT,
    "sentences" JSONB,
    "words" JSONB,
    "author_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MultipleChoiceQuestion" ADD CONSTRAINT "MultipleChoiceQuestion_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortAnswerQuestion" ADD CONSTRAINT "ShortAnswerQuestion_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LongAnswerQuestion" ADD CONSTRAINT "LongAnswerQuestion_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordList" ADD CONSTRAINT "WordList_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
