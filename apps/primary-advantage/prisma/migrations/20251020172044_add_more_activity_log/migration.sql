-- AlterTable
ALTER TABLE "public"."article_activity_logs" ADD COLUMN     "isSentenceClozeTestCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSentenceMatchingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSentenceOrderingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSentenceWordOrderingCompleted" BOOLEAN NOT NULL DEFAULT false;
