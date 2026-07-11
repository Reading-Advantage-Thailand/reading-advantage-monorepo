ALTER TABLE "activity_tutorial_repository_states" ADD COLUMN "submission_id" text;
--> statement-breakpoint
ALTER TABLE "activity_tutorial_repository_states" ADD COLUMN "step_id" text;
--> statement-breakpoint
UPDATE "activity_tutorial_repository_states" SET "submission_id" = 'legacy:' || "id", "step_id" = 'legacy' WHERE "submission_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "activity_tutorial_repository_states" ALTER COLUMN "submission_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "activity_tutorial_repository_states" ALTER COLUMN "step_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "activity_tutorial_repository_states_submission_idx" ON "activity_tutorial_repository_states" USING btree ("tenant_key", "learner_id", "session_id", "submission_id");
