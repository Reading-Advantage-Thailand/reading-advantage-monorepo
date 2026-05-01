/*
  Warnings:

  - You are about to drop the column `xpEarned` on the `UserActivity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserActivity" DROP COLUMN "xpEarned",
ADD COLUMN     "timer" INTEGER;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "cefrLevel" SET DEFAULT 'A1-';

-- CreateTable
CREATE TABLE "XPLogs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XPLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserActivity_user_id_activityType_targetId_idx" ON "UserActivity"("user_id", "activityType", "targetId");

-- AddForeignKey
ALTER TABLE "XPLogs" ADD CONSTRAINT "XPLogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
