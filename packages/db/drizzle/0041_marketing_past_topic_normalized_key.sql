ALTER TABLE "past_topics" ADD COLUMN "normalized_key" text;
--> statement-breakpoint
UPDATE "past_topics"
SET "normalized_key" = lower(
  btrim(
    regexp_replace(
      regexp_replace(normalize("topic", NFC), '[[:space:]]+', ' ', 'g'),
      ' ([ก-๛])',
      '\1',
      'g'
    )
  )
);
--> statement-breakpoint
DELETE FROM "past_topics" AS duplicate
USING "past_topics" AS keeper
WHERE duplicate."app" = keeper."app"
  AND duplicate."normalized_key" = keeper."normalized_key"
  AND (
    duplicate."created_at" > keeper."created_at"
    OR (
      duplicate."created_at" = keeper."created_at"
      AND duplicate."id"::text > keeper."id"::text
    )
  );
--> statement-breakpoint
ALTER TABLE "past_topics" ALTER COLUMN "normalized_key" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "past_topics_app_normalized_key_unique"
ON "past_topics" USING btree ("app", "normalized_key");
