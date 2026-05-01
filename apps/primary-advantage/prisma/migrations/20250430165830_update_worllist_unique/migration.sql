/*
  Warnings:

  - A unique constraint covering the columns `[article_id]` on the table `WordList` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WordList_article_id_key" ON "WordList"("article_id");
