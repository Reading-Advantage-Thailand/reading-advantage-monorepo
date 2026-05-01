-- CreateEnum
CREATE TYPE "TeacherRole" AS ENUM ('OWNER', 'CO_TEACHER');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('READ', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "classrooms" DROP CONSTRAINT "classrooms_teacher_id_fkey";

-- AlterTable
ALTER TABLE "classrooms" ADD COLUMN     "created_by" TEXT,
ALTER COLUMN "teacher_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "classroomTeachers" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "classroom_id" TEXT NOT NULL,
    "role" "TeacherRole" NOT NULL DEFAULT 'CO_TEACHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classroomTeachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "type" TEXT,
    "genre" TEXT,
    "subgenre" TEXT,
    "ra_level" INTEGER NOT NULL,
    "cefr_level" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "average_rating" DOUBLE PRECISION,
    "audio_url" TEXT,
    "image_url" TEXT,
    "author_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "image_url" TEXT,
    "audio_url" TEXT,
    "rating" DOUBLE PRECISION,
    "user_rating_count" INTEGER,
    "word_count" INTEGER,
    "sentences" JSONB,
    "words" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_timepoints" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "timepoints" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_timepoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "title" TEXT,
    "level" INTEGER,
    "rated" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" "QuizStatus" NOT NULL DEFAULT 'READ',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_trackings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "title" TEXT,
    "level" INTEGER,
    "rated" INTEGER NOT NULL DEFAULT 0,
    "scores" INTEGER NOT NULL DEFAULT 0,
    "status" "QuizStatus" NOT NULL DEFAULT 'READ',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapter_trackings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcq_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "question_number" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "user_answer" TEXT,
    "is_correct" BOOLEAN,
    "time_spent" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcq_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saq_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "question_number" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "user_answer" TEXT,
    "score" DOUBLE PRECISION,
    "time_spent" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saq_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laq_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "question_number" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "user_answer" TEXT,
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "time_spent" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laq_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_assignments" (
    "id" TEXT NOT NULL,
    "classroom_id" TEXT NOT NULL,
    "user_id" TEXT,
    "story_id" TEXT NOT NULL,
    "article_id" TEXT,
    "status" "Status" NOT NULL DEFAULT 'NOT_STARTED',
    "title" TEXT,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "phase1" JSONB NOT NULL DEFAULT '{"status": 2, "elapsedTime": 0}',
    "phase2" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase3" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase4" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase5" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase6" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase7" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase8" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase9" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase10" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase11" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase12" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase13" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "phase14" JSONB NOT NULL DEFAULT '{"status": 0, "elapsedTime": 0}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "classroomTeachers_classroom_id_teacher_id_key" ON "classroomTeachers"("classroom_id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_story_id_chapter_number_key" ON "chapters"("story_id", "chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "story_timepoints_story_id_chapter_number_key" ON "story_timepoints"("story_id", "chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "story_records_user_id_story_id_key" ON "story_records"("user_id", "story_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_trackings_user_id_story_id_chapter_number_key" ON "chapter_trackings"("user_id", "story_id", "chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "mcq_records_user_id_story_id_chapter_number_question_number_key" ON "mcq_records"("user_id", "story_id", "chapter_number", "question_number");

-- CreateIndex
CREATE UNIQUE INDEX "saq_records_user_id_story_id_chapter_number_question_number_key" ON "saq_records"("user_id", "story_id", "chapter_number", "question_number");

-- CreateIndex
CREATE UNIQUE INDEX "laq_records_user_id_story_id_chapter_number_question_number_key" ON "laq_records"("user_id", "story_id", "chapter_number", "question_number");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_records_user_id_article_id_key" ON "lesson_records"("user_id", "article_id");

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroomTeachers" ADD CONSTRAINT "classroomTeachers_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroomTeachers" ADD CONSTRAINT "classroomTeachers_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_timepoints" ADD CONSTRAINT "story_timepoints_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_records" ADD CONSTRAINT "story_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_records" ADD CONSTRAINT "story_records_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_trackings" ADD CONSTRAINT "chapter_trackings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_trackings" ADD CONSTRAINT "chapter_trackings_story_id_chapter_number_fkey" FOREIGN KEY ("story_id", "chapter_number") REFERENCES "chapters"("story_id", "chapter_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_trackings" ADD CONSTRAINT "chapter_trackings_user_id_story_id_fkey" FOREIGN KEY ("user_id", "story_id") REFERENCES "story_records"("user_id", "story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcq_records" ADD CONSTRAINT "mcq_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saq_records" ADD CONSTRAINT "saq_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laq_records" ADD CONSTRAINT "laq_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_assignments" ADD CONSTRAINT "story_assignments_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_assignments" ADD CONSTRAINT "story_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_assignments" ADD CONSTRAINT "story_assignments_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_assignments" ADD CONSTRAINT "story_assignments_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_records" ADD CONSTRAINT "lesson_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_records" ADD CONSTRAINT "lesson_records_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
