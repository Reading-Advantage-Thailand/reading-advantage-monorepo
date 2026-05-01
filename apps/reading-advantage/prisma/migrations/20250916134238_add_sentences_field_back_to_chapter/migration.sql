/*
  Warnings:

  - You are about to drop the column `audio_url` on the `stories` table. All the data in the column will be lost.
  - You are about to drop the column `audio_word_url` on the `stories` table. All the data in the column will be lost.
  - You are about to drop the column `sentences` on the `stories` table. All the data in the column will be lost.
  - You are about to drop the column `words` on the `stories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stories" DROP COLUMN "audio_url",
DROP COLUMN "audio_word_url",
DROP COLUMN "sentences",
DROP COLUMN "words";
