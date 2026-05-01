/*
  Warnings:

  - You are about to drop the column `image_url` on the `chapters` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `stories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chapters" DROP COLUMN "image_url",
ADD COLUMN     "image_description" TEXT;

-- AlterTable
ALTER TABLE "stories" DROP COLUMN "image_url",
ADD COLUMN     "image_description" TEXT,
ADD COLUMN     "story_bible" JSONB,
ALTER COLUMN "ra_level" DROP NOT NULL,
ALTER COLUMN "cefr_level" DROP NOT NULL;
