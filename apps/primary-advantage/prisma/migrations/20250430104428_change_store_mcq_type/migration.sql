/*
  Warnings:

  - Added the required column `answer` to the `MultipleChoiceQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MultipleChoiceQuestion" ADD COLUMN     "answer" TEXT NOT NULL,
ADD COLUMN     "options" TEXT[],
ALTER COLUMN "question" SET DATA TYPE TEXT;
