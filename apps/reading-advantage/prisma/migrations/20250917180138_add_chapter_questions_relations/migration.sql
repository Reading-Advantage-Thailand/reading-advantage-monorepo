-- AlterTable
ALTER TABLE "LongAnswerQuestion" ADD COLUMN     "chapter_id" TEXT,
ALTER COLUMN "article_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MultipleChoiceQuestion" ADD COLUMN     "chapter_id" TEXT,
ALTER COLUMN "article_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ShortAnswerQuestion" ADD COLUMN     "chapter_id" TEXT,
ALTER COLUMN "article_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MultipleChoiceQuestion" ADD CONSTRAINT "MultipleChoiceQuestion_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortAnswerQuestion" ADD CONSTRAINT "ShortAnswerQuestion_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LongAnswerQuestion" ADD CONSTRAINT "LongAnswerQuestion_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
