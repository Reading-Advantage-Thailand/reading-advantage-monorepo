/*
  Warnings:

  - You are about to drop the column `user_id` on the `LongAnswerQuestion_ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `MultipleChoiceQuestion_ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `ShortAnswerQuestion_ActivityLog` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "LongAnswerQuestion_ActivityLog" DROP CONSTRAINT "LongAnswerQuestion_ActivityLog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "MultipleChoiceQuestion_ActivityLog" DROP CONSTRAINT "MultipleChoiceQuestion_ActivityLog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ShortAnswerQuestion_ActivityLog" DROP CONSTRAINT "ShortAnswerQuestion_ActivityLog_user_id_fkey";

-- AlterTable
ALTER TABLE "LongAnswerQuestion_ActivityLog" DROP COLUMN "user_id";

-- AlterTable
ALTER TABLE "MultipleChoiceQuestion_ActivityLog" DROP COLUMN "user_id";

-- AlterTable
ALTER TABLE "ShortAnswerQuestion_ActivityLog" DROP COLUMN "user_id";
