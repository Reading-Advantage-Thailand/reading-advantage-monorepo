ALTER TABLE "codecamp_pr_reviews"
  ADD COLUMN IF NOT EXISTS "rubric_evaluation_json" jsonb;
