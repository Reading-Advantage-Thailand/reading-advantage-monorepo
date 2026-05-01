/*
  Warnings:

  - You are about to drop the column `levelTestAt` on the `UserActiclity` table. All the data in the column will be lost.
  - You are about to drop the `LongAnswerQuestion_ActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MultipleChoiceQuestion_ActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShortAnswerQuestion_ActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `activityType` to the `UserActiclity` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('ARTICLE_RATING', 'ARTICLE_READ', 'STORIES_RATING', 'STORIES_READ', 'CHAPTER_RATING', 'CHAPTER_READ', 'LEVEL_TEST', 'MC_QUESTION', 'SA_QUESTION', 'LA_QUESTION', 'SENTENCE_FLASHCARDS', 'SENTENCE_MATCHING', 'SENTENCE_ORDERING', 'SENTENCE_WORD_ORDERING', 'SENTENCE_CLOZE_TEST', 'VOCABULARY_FLASHCARDS', 'VOCABULARY_MATCHING');

-- DropForeignKey
ALTER TABLE "LongAnswerQuestion_ActivityLog" DROP CONSTRAINT "LongAnswerQuestion_ActivityLog_activity_id_fkey";

-- DropForeignKey
ALTER TABLE "LongAnswerQuestion_ActivityLog" DROP CONSTRAINT "LongAnswerQuestion_ActivityLog_article_id_fkey";

-- DropForeignKey
ALTER TABLE "MultipleChoiceQuestion_ActivityLog" DROP CONSTRAINT "MultipleChoiceQuestion_ActivityLog_activity_id_fkey";

-- DropForeignKey
ALTER TABLE "MultipleChoiceQuestion_ActivityLog" DROP CONSTRAINT "MultipleChoiceQuestion_ActivityLog_article_id_fkey";

-- DropForeignKey
ALTER TABLE "ShortAnswerQuestion_ActivityLog" DROP CONSTRAINT "ShortAnswerQuestion_ActivityLog_activity_id_fkey";

-- DropForeignKey
ALTER TABLE "ShortAnswerQuestion_ActivityLog" DROP CONSTRAINT "ShortAnswerQuestion_ActivityLog_article_id_fkey";

-- AlterTable
ALTER TABLE "UserActiclity" DROP COLUMN "levelTestAt",
ADD COLUMN     "activityType" "ActivityType" NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "targetId" TEXT,
ADD COLUMN     "xpEarned" INTEGER;

-- DropTable
DROP TABLE "LongAnswerQuestion_ActivityLog";

-- DropTable
DROP TABLE "MultipleChoiceQuestion_ActivityLog";

-- DropTable
DROP TABLE "ShortAnswerQuestion_ActivityLog";
