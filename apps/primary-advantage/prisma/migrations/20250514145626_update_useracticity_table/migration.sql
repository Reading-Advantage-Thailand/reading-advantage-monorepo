/*
  Warnings:

  - You are about to drop the column `metadata` on the `UserActiclity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserActiclity" DROP COLUMN "metadata",
ADD COLUMN     "details" JSONB;
