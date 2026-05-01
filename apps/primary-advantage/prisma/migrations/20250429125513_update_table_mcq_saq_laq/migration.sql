/*
  Warnings:

  - You are about to drop the column `suggestedAnswer` on the `ShortAnswerQuestion` table. All the data in the column will be lost.
  - Added the required column `answer` to the `ShortAnswerQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShortAnswerQuestion" DROP COLUMN "suggestedAnswer",
ADD COLUMN     "answer" TEXT NOT NULL;
