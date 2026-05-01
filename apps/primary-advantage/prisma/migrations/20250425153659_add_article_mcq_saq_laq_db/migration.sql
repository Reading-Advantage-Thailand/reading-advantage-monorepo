/*
  Warnings:

  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'STUDENT', 'TEACHER', 'ADMIN', 'SYSTEM');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "subGenre" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "passage" TEXT NOT NULL,
    "imageDescription" TEXT NOT NULL,
    "cefrLevel" TEXT NOT NULL,
    "raLevel" INTEGER NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MultipleChoiceQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "answer" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MultipleChoiceQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortAnswerQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT[],
    "answer" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortAnswerQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LongAnswerQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT[],
    "answer" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LongAnswerQuestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MultipleChoiceQuestion" ADD CONSTRAINT "MultipleChoiceQuestion_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortAnswerQuestion" ADD CONSTRAINT "ShortAnswerQuestion_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LongAnswerQuestion" ADD CONSTRAINT "LongAnswerQuestion_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
