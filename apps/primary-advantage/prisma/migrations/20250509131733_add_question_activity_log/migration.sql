-- AlterTable
ALTER TABLE "MultipleChoiceQuestion" ADD COLUMN     "textualEvidence" TEXT;

-- CreateTable
CREATE TABLE "UserActiclity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "levelTestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserActiclity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MultipleChoiceQuestion_ActivityLog" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MultipleChoiceQuestion_ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortAnswerQuestion_ActivityLog" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortAnswerQuestion_ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LongAnswerQuestion_ActivityLog" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LongAnswerQuestion_ActivityLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserActiclity" ADD CONSTRAINT "UserActiclity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultipleChoiceQuestion_ActivityLog" ADD CONSTRAINT "MultipleChoiceQuestion_ActivityLog_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "UserActiclity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultipleChoiceQuestion_ActivityLog" ADD CONSTRAINT "MultipleChoiceQuestion_ActivityLog_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultipleChoiceQuestion_ActivityLog" ADD CONSTRAINT "MultipleChoiceQuestion_ActivityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortAnswerQuestion_ActivityLog" ADD CONSTRAINT "ShortAnswerQuestion_ActivityLog_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "UserActiclity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortAnswerQuestion_ActivityLog" ADD CONSTRAINT "ShortAnswerQuestion_ActivityLog_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortAnswerQuestion_ActivityLog" ADD CONSTRAINT "ShortAnswerQuestion_ActivityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LongAnswerQuestion_ActivityLog" ADD CONSTRAINT "LongAnswerQuestion_ActivityLog_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "UserActiclity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LongAnswerQuestion_ActivityLog" ADD CONSTRAINT "LongAnswerQuestion_ActivityLog_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LongAnswerQuestion_ActivityLog" ADD CONSTRAINT "LongAnswerQuestion_ActivityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
