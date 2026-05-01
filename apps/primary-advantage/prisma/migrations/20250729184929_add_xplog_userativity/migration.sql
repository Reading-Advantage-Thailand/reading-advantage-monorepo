-- CreateTable
CREATE TABLE "_UserActivityToXPLogs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserActivityToXPLogs_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserActivityToXPLogs_B_index" ON "_UserActivityToXPLogs"("B");

-- AddForeignKey
ALTER TABLE "_UserActivityToXPLogs" ADD CONSTRAINT "_UserActivityToXPLogs_A_fkey" FOREIGN KEY ("A") REFERENCES "user_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserActivityToXPLogs" ADD CONSTRAINT "_UserActivityToXPLogs_B_fkey" FOREIGN KEY ("B") REFERENCES "xp_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
