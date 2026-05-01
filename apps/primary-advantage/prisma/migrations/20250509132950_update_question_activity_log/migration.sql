/*
  Warnings:

  - You are about to drop the column `isCorrect` on the `LongAnswerQuestion_ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `isCorrect` on the `MultipleChoiceQuestion_ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `isCorrect` on the `ShortAnswerQuestion_ActivityLog` table. All the data in the column will be lost.
  - Added the required column `xpEarned` to the `LongAnswerQuestion_ActivityLog` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `answer` on the `LongAnswerQuestion_ActivityLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `xpEarned` to the `MultipleChoiceQuestion_ActivityLog` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `answer` on the `MultipleChoiceQuestion_ActivityLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `xpEarned` to the `ShortAnswerQuestion_ActivityLog` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `answer` on the `ShortAnswerQuestion_ActivityLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "LongAnswerQuestion_ActivityLog" DROP COLUMN "isCorrect",
ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "xpEarned" INTEGER NOT NULL,
DROP COLUMN "answer",
ADD COLUMN     "answer" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "MultipleChoiceQuestion_ActivityLog" DROP COLUMN "isCorrect",
ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "xpEarned" INTEGER NOT NULL,
DROP COLUMN "answer",
ADD COLUMN     "answer" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "ShortAnswerQuestion_ActivityLog" DROP COLUMN "isCorrect",
ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "xpEarned" INTEGER NOT NULL,
DROP COLUMN "answer",
ADD COLUMN     "answer" JSONB NOT NULL;
