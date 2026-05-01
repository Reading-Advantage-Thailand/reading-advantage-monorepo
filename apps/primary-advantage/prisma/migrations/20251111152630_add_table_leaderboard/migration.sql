-- CreateTable
CREATE TABLE "public"."leaderboards" (
    "id" TEXT NOT NULL,
    "school_id" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."leaderboards" ADD CONSTRAINT "leaderboards_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
