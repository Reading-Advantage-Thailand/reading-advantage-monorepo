/*
  Warnings:

  - You are about to drop the column `suggested_answer` on the `ShortAnswerQuestion` table. All the data in the column will be lost.
  - Added the required column `suggestedAnswer` to the `ShortAnswerQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShortAnswerQuestion" DROP COLUMN "suggested_answer",
ADD COLUMN     "suggestedAnswer" TEXT NOT NULL;
