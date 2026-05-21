-- Add unique constraints to codecamp_exercise_repos.repo_url and
-- codecamp_pr_reviews.pr_url. These constraints exist in the Drizzle schema
-- but were omitted from the original migration files.
-- Run this migration before redeploying to ensure data integrity.

CREATE UNIQUE INDEX IF NOT EXISTS "codecamp_exercise_repos_repo_url_unique"
  ON "codecamp_exercise_repos" ("repo_url");

CREATE UNIQUE INDEX IF NOT EXISTS "codecamp_pr_reviews_pr_url_unique"
  ON "codecamp_pr_reviews" ("pr_url");
