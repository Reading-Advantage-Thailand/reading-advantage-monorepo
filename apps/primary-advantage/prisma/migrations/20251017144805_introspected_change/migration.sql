/*
  Warnings:

  - You are about to drop the column `expiry_days` on the `licenses` table. All the data in the column will be lost.
  - You are about to drop the column `license_id` on the `schools` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."SubscriptionType" AS ENUM ('BASIC', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "public"."schools" DROP CONSTRAINT "schools_license_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_roles" DROP CONSTRAINT "user_roles_roleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_roles" DROP CONSTRAINT "user_roles_userId_fkey";

-- DropIndex
DROP INDEX "public"."schools_license_id_key";

-- AlterTable
ALTER TABLE "public"."article" ADD COLUMN     "brainstorming" TEXT,
ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_draft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planning" TEXT,
ADD COLUMN     "topic" TEXT,
ALTER COLUMN "sub_genre" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."licenses" DROP COLUMN "expiry_days",
ADD COLUMN     "school_id" TEXT,
ADD COLUMN     "subscription" "public"."SubscriptionType" NOT NULL DEFAULT 'BASIC';

-- AlterTable
ALTER TABLE "public"."schools" DROP COLUMN "license_id";

-- CreateTable
CREATE TABLE "public"."article_activity_logs" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isMultipleChoiceQuestionCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isShortAnswerQuestionCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isLongAnswerQuestionCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isRated" BOOLEAN NOT NULL DEFAULT false,
    "isSentenceAndWordsSaved" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "article_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sentencs_and_words_for_flashcard" (
    "id" TEXT NOT NULL,
    "sentence" JSONB,
    "audio_sentences_url" TEXT,
    "words" JSONB,
    "words_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "article_id" TEXT NOT NULL,

    CONSTRAINT "sentencs_and_words_for_flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cloze_test_games" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "flashcard_card_id" TEXT NOT NULL,

    CONSTRAINT "cloze_test_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignments" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "classroom_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignment_students" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignment_students_assignment_id_student_id_key" ON "public"."assignment_students"("assignment_id", "student_id");

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."article_activity_logs" ADD CONSTRAINT "article_activity_logs_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."article_activity_logs" ADD CONSTRAINT "article_activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sentencs_and_words_for_flashcard" ADD CONSTRAINT "sentencs_and_words_for_flashcard_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."flashcard_cards" ADD CONSTRAINT "flashcard_cards_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cloze_test_games" ADD CONSTRAINT "cloze_test_games_flashcard_card_id_fkey" FOREIGN KEY ("flashcard_card_id") REFERENCES "public"."flashcard_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."licenses" ADD CONSTRAINT "licenses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignment_students" ADD CONSTRAINT "assignment_students_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignment_students" ADD CONSTRAINT "assignment_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
