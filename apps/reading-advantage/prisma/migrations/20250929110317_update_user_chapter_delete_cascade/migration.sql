/*
  Warnings:

  - You are about to drop the column `questions` on the `chapters` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "license_on_users" DROP CONSTRAINT "license_on_users_licenseId_fkey";

-- DropForeignKey
ALTER TABLE "license_on_users" DROP CONSTRAINT "license_on_users_userId_fkey";

-- AlterTable
ALTER TABLE "chapters" DROP COLUMN "questions";

-- AddForeignKey
ALTER TABLE "license_on_users" ADD CONSTRAINT "license_on_users_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_on_users" ADD CONSTRAINT "license_on_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
