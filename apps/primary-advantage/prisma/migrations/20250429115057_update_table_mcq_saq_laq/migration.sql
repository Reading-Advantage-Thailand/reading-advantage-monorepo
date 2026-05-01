/*
  Warnings:

  - You are about to drop the column `answer` on the `ShortAnswerQuestion` table. All the data in the column will be lost.
  - Added the required column `suggested_answer` to the `ShortAnswerQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LongAnswerQuestion" ALTER COLUMN "question" SET NOT NULL,
ALTER COLUMN "question" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ShortAnswerQuestion" DROP COLUMN "answer",
ADD COLUMN     "suggested_answer" TEXT NOT NULL,
ALTER COLUMN "question" SET NOT NULL,
ALTER COLUMN "question" SET DATA TYPE TEXT;
