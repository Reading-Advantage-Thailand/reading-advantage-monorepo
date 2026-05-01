-- CreateEnum
CREATE TYPE "FlashcardType" AS ENUM ('VOCABULARY', 'SENTENCE');

-- CreateEnum
CREATE TYPE "CardState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');

-- CreateTable
CREATE TABLE "flashcard_decks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FlashcardType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcard_decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_cards" (
    "id" TEXT NOT NULL,
    "deck_id" TEXT NOT NULL,
    "type" "FlashcardType" NOT NULL,
    "article_id" TEXT,
    "audio_url" TEXT,
    "start_time" DOUBLE PRECISION,
    "end_time" DOUBLE PRECISION,
    "word" TEXT,
    "definition" JSONB,
    "sentence" TEXT,
    "translation" JSONB,
    "context" TEXT,
    "due" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "elapsed_days" INTEGER NOT NULL DEFAULT 0,
    "scheduled_days" INTEGER NOT NULL DEFAULT 0,
    "learning_steps" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "state" "CardState" NOT NULL DEFAULT 'NEW',
    "last_review" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcard_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_reviews" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "time_spent" INTEGER,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_reviews_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "flashcard_decks" ADD CONSTRAINT "flashcard_decks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_cards" ADD CONSTRAINT "flashcard_cards_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "flashcard_decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_reviews" ADD CONSTRAINT "card_reviews_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "flashcard_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
