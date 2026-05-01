-- AlterTable
ALTER TABLE "flashcard_cards" ADD COLUMN     "story_chapter_id" TEXT;

-- AlterTable
ALTER TABLE "long_answer_questions" ADD COLUMN     "story_chapter_id" TEXT,
ALTER COLUMN "article_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "multiple_choice_questions" ADD COLUMN     "story_chapter_id" TEXT,
ALTER COLUMN "article_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "short_answer_questions" ADD COLUMN     "story_chapter_id" TEXT,
ALTER COLUMN "article_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "imageDescription" TEXT NOT NULL,
    "type" TEXT,
    "genre" TEXT,
    "subGenre" TEXT,
    "cefrLevel" TEXT,
    "raLevel" INTEGER,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_chapters" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "translatedSummary" JSONB,
    "imageDescription" TEXT NOT NULL,
    "sentences" JSONB,
    "translatedSentences" JSONB,
    "audio_sentences_url" TEXT,
    "words" JSONB,
    "audio_words_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_chapters_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "multiple_choice_questions" ADD CONSTRAINT "multiple_choice_questions_story_chapter_id_fkey" FOREIGN KEY ("story_chapter_id") REFERENCES "story_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_answer_questions" ADD CONSTRAINT "short_answer_questions_story_chapter_id_fkey" FOREIGN KEY ("story_chapter_id") REFERENCES "story_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "long_answer_questions" ADD CONSTRAINT "long_answer_questions_story_chapter_id_fkey" FOREIGN KEY ("story_chapter_id") REFERENCES "story_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_cards" ADD CONSTRAINT "flashcard_cards_story_chapter_id_fkey" FOREIGN KEY ("story_chapter_id") REFERENCES "story_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_chapters" ADD CONSTRAINT "story_chapters_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
