-- Add unique constraints to codecamp_exercise_repos.repo_url and
-- codecamp_pr_reviews.pr_url. These constraints exist in the Drizzle schema
-- but were omitted from the original migration files.
-- Run this migration before redeploying to ensure data integrity.

ALTER TABLE "codecamp_exercise_repos"
  ADD CONSTRAINT "codecamp_exercise_repos_repo_url_unique" UNIQUE ("repo_url");

ALTER TABLE "codecamp_pr_reviews"
  ADD CONSTRAINT "codecamp_pr_reviews_pr_url_unique" UNIQUE ("pr_url");
