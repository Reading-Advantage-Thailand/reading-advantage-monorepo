-- Primary stories (track primary_parity_stories_20261011, S1). Additive or relaxing only.
-- The tutor_compat views read article_id and the flashcard columns; no type change and no column drop here.
ALTER TABLE "stories" ADD COLUMN "image" text;
--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "image" text;
--> statement-breakpoint
ALTER TABLE "sentencs_and_words_for_flashcard" ADD COLUMN "chapter_id" text;
--> statement-breakpoint
ALTER TABLE "sentencs_and_words_for_flashcard" ALTER COLUMN "article_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "sentencs_and_words_for_flashcard" ADD CONSTRAINT "sentencs_and_words_for_flashcard_one_owner_check" CHECK (("article_id" IS NOT NULL) <> ("chapter_id" IS NOT NULL));
