/*
  Warnings:

  - You are about to drop the `laq_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mcq_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `saq_records` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "laq_records" DROP CONSTRAINT "laq_records_user_id_fkey";

-- DropForeignKey
ALTER TABLE "mcq_records" DROP CONSTRAINT "mcq_records_user_id_fkey";

-- DropForeignKey
ALTER TABLE "saq_records" DROP CONSTRAINT "saq_records_user_id_fkey";

-- DropTable
DROP TABLE "laq_records";

-- DropTable
DROP TABLE "mcq_records";

-- DropTable
DROP TABLE "saq_records";
