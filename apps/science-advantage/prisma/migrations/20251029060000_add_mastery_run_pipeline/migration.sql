-- CreateEnum
CREATE TYPE "MasteryRunStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "MasteryRun" (
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "MasteryRunStatus" NOT NULL DEFAULT 'PENDING',
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasteryRun_pkey" PRIMARY KEY ("attemptId")
);

-- CreateIndex
CREATE INDEX "MasteryRun_studentId_idx" ON "MasteryRun"("studentId");

-- AddForeignKey
ALTER TABLE "MasteryRun" ADD CONSTRAINT "MasteryRun_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryRun" ADD CONSTRAINT "MasteryRun_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

