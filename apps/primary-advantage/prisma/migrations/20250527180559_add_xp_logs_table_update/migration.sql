/*
  Warnings:

  - Added the required column `activityType` to the `XPLogs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "XPLogs" ADD COLUMN     "activityId" TEXT,
ADD COLUMN     "activityType" "ActivityType" NOT NULL;
