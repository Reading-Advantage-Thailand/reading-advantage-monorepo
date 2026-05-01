-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT,
    "province" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Thailand',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ra_cefr_mappings" (
    "id" TEXT NOT NULL,
    "ra_level" INTEGER NOT NULL,
    "cefr_level" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ra_cefr_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genre_adjacencies" (
    "id" TEXT NOT NULL,
    "primary_genre" TEXT NOT NULL,
    "adjacent_genre" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genre_adjacencies_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "school_id" TEXT;

-- AlterTable
ALTER TABLE "classrooms" ADD COLUMN "school_id" TEXT;

-- AlterTable
ALTER TABLE "licenses" 
    ADD COLUMN "school_id" TEXT,
    ADD COLUMN "feature_flags" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE UNIQUE INDEX "ra_cefr_mappings_ra_level_key" ON "ra_cefr_mappings"("ra_level");

-- CreateIndex
CREATE UNIQUE INDEX "genre_adjacencies_primary_genre_adjacent_genre_key" ON "genre_adjacencies"("primary_genre", "adjacent_genre");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
