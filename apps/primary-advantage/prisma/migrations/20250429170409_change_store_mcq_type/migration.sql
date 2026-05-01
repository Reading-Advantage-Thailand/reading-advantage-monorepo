/*
  Warnings:

  - You are about to drop the column `answer` on the `MultipleChoiceQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `MultipleChoiceQuestion` table. All the data in the column will be lost.
  - Changed the type of `question` on the `MultipleChoiceQuestion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "MultipleChoiceQuestion" DROP COLUMN "answer",
DROP COLUMN "options",
DROP COLUMN "question",
ADD COLUMN     "question" JSONB NOT NULL;
