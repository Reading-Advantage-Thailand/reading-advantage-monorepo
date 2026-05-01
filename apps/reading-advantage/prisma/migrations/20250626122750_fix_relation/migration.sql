-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_license_id_fkey";

-- CreateTable
CREATE TABLE "_ActiveLicense" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ActiveLicense_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ActiveLicense_B_index" ON "_ActiveLicense"("B");

-- AddForeignKey
ALTER TABLE "_ActiveLicense" ADD CONSTRAINT "_ActiveLicense_A_fkey" FOREIGN KEY ("A") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActiveLicense" ADD CONSTRAINT "_ActiveLicense_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
