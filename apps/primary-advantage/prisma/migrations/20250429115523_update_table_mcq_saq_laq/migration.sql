/*
  Warnings:

  - You are about to drop the column `answer` on the `LongAnswerQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `answer` on the `MultipleChoiceQuestion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LongAnswerQuestion" DROP COLUMN "answer";

-- AlterTable
ALTER TABLE "MultipleChoiceQuestion" DROP COLUMN "answer";
