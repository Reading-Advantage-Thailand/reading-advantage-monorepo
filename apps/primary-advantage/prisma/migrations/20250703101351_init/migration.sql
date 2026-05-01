/*
  Warnings:

  - You are about to drop the `Classroom` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClassroomStudent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LongAnswerQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MultipleChoiceQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShortAnswerQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserActivity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WordList` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `XPLogs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Classroom" DROP CONSTRAINT "Classroom_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "ClassroomStudent" DROP CONSTRAINT "ClassroomStudent_classroomId_fkey";

-- DropForeignKey
ALTER TABLE "ClassroomStudent" DROP CONSTRAINT "ClassroomStudent_studentId_fkey";

-- DropForeignKey
ALTER TABLE "LongAnswerQuestion" DROP CONSTRAINT "LongAnswerQuestion_article_id_fkey";

-- DropForeignKey
ALTER TABLE "MultipleChoiceQuestion" DROP CONSTRAINT "MultipleChoiceQuestion_article_id_fkey";

-- DropForeignKey
ALTER TABLE "ShortAnswerQuestion" DROP CONSTRAINT "ShortAnswerQuestion_article_id_fkey";

-- DropForeignKey
ALTER TABLE "UserActivity" DROP CONSTRAINT "UserActivity_user_id_fkey";

-- DropForeignKey
ALTER TABLE "WordList" DROP CONSTRAINT "WordList_article_id_fkey";

-- DropForeignKey
ALTER TABLE "XPLogs" DROP CONSTRAINT "XPLogs_user_id_fkey";

-- DropTable
DROP TABLE "Classroom";

-- DropTable
DROP TABLE "ClassroomStudent";

-- DropTable
DROP TABLE "LongAnswerQuestion";

-- DropTable
DROP TABLE "MultipleChoiceQuestion";

-- DropTable
DROP TABLE "ShortAnswerQuestion";

-- DropTable
DROP TABLE "UserActivity";

-- DropTable
DROP TABLE "WordList";

-- DropTable
DROP TABLE "XPLogs";

-- CreateTable
CREATE TABLE "xp_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "activityId" TEXT,
    "activityType" "ActivityType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "targetId" TEXT,
    "timer" INTEGER,
    "details" JSONB,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multiple_choice_questions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "answer" TEXT NOT NULL,
    "textualEvidence" TEXT,
    "article_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "multiple_choice_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_answer_questions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "short_answer_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "long_answer_questions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "long_answer_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classCode" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_students" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,

    CONSTRAINT "classroom_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_activities_user_id_activityType_targetId_idx" ON "user_activities"("user_id", "activityType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_classCode_key" ON "classrooms"("classCode");

-- CreateIndex
CREATE UNIQUE INDEX "classroom_students_classroomId_studentId_key" ON "classroom_students"("classroomId", "studentId");

-- AddForeignKey
ALTER TABLE "xp_logs" ADD CONSTRAINT "xp_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multiple_choice_questions" ADD CONSTRAINT "multiple_choice_questions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_answer_questions" ADD CONSTRAINT "short_answer_questions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "long_answer_questions" ADD CONSTRAINT "long_answer_questions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
