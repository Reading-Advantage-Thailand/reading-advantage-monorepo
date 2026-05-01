-- CreateTable
CREATE TABLE "WordList" (
    "id" TEXT NOT NULL,
    "wordlist" JSONB NOT NULL,
    "timepoints" JSONB NOT NULL,
    "article_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordList_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WordList" ADD CONSTRAINT "WordList_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
