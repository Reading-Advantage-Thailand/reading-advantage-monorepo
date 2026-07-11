ALTER TABLE "activity_tutorial_reports" ADD COLUMN "claim_token" text;
--> statement-breakpoint
UPDATE "activity_tutorial_reports" SET "claim_token" = gen_random_uuid()::text WHERE "claim_token" IS NULL;
--> statement-breakpoint
ALTER TABLE "activity_tutorial_reports" ALTER COLUMN "claim_token" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "activity_tutorial_repository_states" ADD COLUMN "activity_id" text;
--> statement-breakpoint
ALTER TABLE "activity_tutorial_repository_states" ADD COLUMN "activity_version" text;
--> statement-breakpoint
ALTER TABLE "activity_tutorial_repository_states" ADD COLUMN "graph_version" text;
--> statement-breakpoint
UPDATE "activity_tutorial_repository_states" SET "activity_id" = 'legacy', "activity_version" = 'legacy', "graph_version" = 'legacy' WHERE "activity_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "activity_tutorial_repository_states" ALTER COLUMN "activity_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "activity_tutorial_repository_states" ALTER COLUMN "activity_version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "activity_tutorial_repository_states" ALTER COLUMN "graph_version" SET NOT NULL;
