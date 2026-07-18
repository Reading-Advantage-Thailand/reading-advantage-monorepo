ALTER TABLE "past_topics" ADD COLUMN "normalized_key" text;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION marketing_normalize_topic(input_topic text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT lower(
    btrim(
      regexp_replace(
        regexp_replace(normalize(input_topic, NFC), '[[:space:]]+', ' ', 'g'),
        ' ([ก-๛])',
        '\1',
        'g'
      )
    )
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION marketing_derive_past_topic_normalized_key()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.normalized_key := marketing_normalize_topic(NEW.topic);
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER past_topics_derive_normalized_key
BEFORE INSERT OR UPDATE ON "past_topics"
FOR EACH ROW
EXECUTE FUNCTION marketing_derive_past_topic_normalized_key();
--> statement-breakpoint
UPDATE "past_topics"
SET "normalized_key" = marketing_normalize_topic("topic");
--> statement-breakpoint
DO $$
DECLARE
  duplicate_count bigint;
BEGIN
  SELECT count(*)
  INTO duplicate_count
  FROM (
    SELECT "app"
    FROM "past_topics"
    GROUP BY "app", "normalized_key"
    HAVING count(*) > 1
  ) AS duplicate_groups;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION
      'Marketing normalized-topic migration found % duplicate app/topic groups; resolve them explicitly before retrying',
      duplicate_count;
  END IF;
END;
$$;
--> statement-breakpoint
ALTER TABLE "past_topics" ALTER COLUMN "normalized_key" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "past_topics_app_normalized_key_unique"
ON "past_topics" USING btree ("app", "normalized_key");
