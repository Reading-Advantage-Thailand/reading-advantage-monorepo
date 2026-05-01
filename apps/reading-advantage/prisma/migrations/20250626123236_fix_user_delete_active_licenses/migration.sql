/*
  Warnings:

  - You are about to drop the `_ActiveLicense` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ActiveLicense" DROP CONSTRAINT "_ActiveLicense_A_fkey";

-- DropForeignKey
ALTER TABLE "_ActiveLicense" DROP CONSTRAINT "_ActiveLicense_B_fkey";

-- DropTable
DROP TABLE "_ActiveLicense";
