/*
  Warnings:

  - The `status` column on the `assignments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `classcode` on the `classrooms` table. All the data in the column will be lost.
  - You are about to drop the column `license_id` on the `classrooms` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `classrooms` table. All the data in the column will be lost.
  - You are about to drop the column `expiration_date` on the `licenses` table. All the data in the column will be lost.
  - You are about to drop the column `school_name` on the `licenses` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_level` on the `licenses` table. All the data in the column will be lost.
  - You are about to drop the column `total_licenses` on the `licenses` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `licenses` table. All the data in the column will be lost.
  - You are about to drop the `classrooStudents` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[provider,provider_account_id]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key]` on the table `licenses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `schoolName` to the `licenses` table without a default value. This is not possible if the table is not empty.
  - Made the column `updatedAt` on table `licenses` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('BASIC', 'PREMIUM', 'ENTERPRISE');

-- DropForeignKey
ALTER TABLE "classrooStudents" DROP CONSTRAINT "classrooStudents_UserActivity_id_fkey";

-- DropForeignKey
ALTER TABLE "classrooStudents" DROP CONSTRAINT "classrooStudents_classroom_id_fkey";

-- DropForeignKey
ALTER TABLE "classrooStudents" DROP CONSTRAINT "classrooStudents_student_id_fkey";

-- DropForeignKey
ALTER TABLE "classrooms" DROP CONSTRAINT "classrooms_license_id_fkey";

-- DropForeignKey
ALTER TABLE "licenses" DROP CONSTRAINT "licenses_user_id_fkey";

-- AlterTable
ALTER TABLE "assignments" DROP COLUMN "status",
ADD COLUMN     "status" "Status" DEFAULT 'NOT_STARTED',
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "classrooms" DROP COLUMN "classcode",
DROP COLUMN "license_id",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "licenses" DROP COLUMN "expiration_date",
DROP COLUMN "school_name",
DROP COLUMN "subscription_level",
DROP COLUMN "total_licenses",
DROP COLUMN "user_id",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "licenseType" "LicenseType" NOT NULL DEFAULT 'BASIC',
ADD COLUMN     "maxUsers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "owner_user_id" TEXT,
ADD COLUMN     "schoolName" TEXT NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "classrooStudents";

-- CreateTable
CREATE TABLE "classroomStudents" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "classroom_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classroomStudents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_on_users" (
    "userId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "activateAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_on_users_pkey" PRIMARY KEY ("userId","licenseId")
);

-- CreateIndex
CREATE UNIQUE INDEX "classroomStudents_classroom_id_student_id_key" ON "classroomStudents"("classroom_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_key_key" ON "licenses"("key");

-- AddForeignKey
ALTER TABLE "classroomStudents" ADD CONSTRAINT "classroomStudents_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroomStudents" ADD CONSTRAINT "classroomStudents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_on_users" ADD CONSTRAINT "license_on_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_on_users" ADD CONSTRAINT "license_on_users_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
