/*
  Warnings:

  - You are about to drop the `UserActiclity` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserActiclity" DROP CONSTRAINT "UserActiclity_user_id_fkey";

-- DropTable
DROP TABLE "UserActiclity";

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "targetId" TEXT,
    "details" JSONB,
    "xpEarned" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
