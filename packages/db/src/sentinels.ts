/**
 * Sentinel probes for migration-ledger-doctor.ts.
 * Each entry maps a journal tag to the schema artifact it creates.
 *
 * Doctor exit codes:
 *   0 — clean (all sentinels match ledger)
 *   1 — divergence detected
 *   2 — config/connection error
 */
export interface SentinelProbe {
  tag: string;
  kind: "table" | "column";
  target: string;
}

export const sentinelProbes: Record<string, SentinelProbe> = {
  "0000_wide_vengeance": {
    tag: "0000_wide_vengeance",
    kind: "table",
    target: "users",
  },
  "0001_thick_santa_claus": {
    tag: "0001_thick_santa_claus",
    kind: "table",
    target: "flashcard_decks",
  },
  "0002_quick_skreet": {
    tag: "0002_quick_skreet",
    kind: "table",
    target: "classroom_students",
  },
  "0003_slow_firebrand": {
    tag: "0003_slow_firebrand",
    kind: "column",
    target: "users.username",
  },
  "0004_sturdy_forge": {
    tag: "0004_sturdy_forge",
    kind: "column",
    target: "users.display_username",
  },
  "0005_codecamp_schema": {
    tag: "0005_codecamp_schema",
    kind: "table",
    target: "codecamp_modules",
  },
  "0006_codecamp_indexes": {
    tag: "0006_codecamp_indexes",
    kind: "table",
    target: "codecamp_lessons",
  },
  "0007_codecamp_repos_reviews": {
    tag: "0007_codecamp_repos_reviews",
    kind: "table",
    target: "codecamp_exercise_repos",
  },
  "0008_codecamp_phase": {
    tag: "0008_codecamp_phase",
    kind: "column",
    target: "codecamp_modules.phase",
  },
  "0009_add_github_username": {
    tag: "0009_add_github_username",
    kind: "column",
    target: "users.github_username",
  },
  "0010_codecamp_uniqueness": {
    tag: "0010_codecamp_uniqueness",
    kind: "table",
    target: "codecamp_exercise_repos",
  },
  "0011_codecamp_webhook_events": {
    tag: "0011_codecamp_webhook_events",
    kind: "table",
    target: "codecamp_webhook_events",
  },
  "0012_codecamp_intern_role": {
    tag: "0012_codecamp_intern_role",
    kind: "table",
    target: "users",
  },
  "0013_prisma_drizzle_schema_unification": {
    tag: "0013_prisma_drizzle_schema_unification",
    kind: "table",
    target: "licenses",
  },
  "0014_users_license_expired_date": {
    tag: "0014_users_license_expired_date",
    kind: "column",
    target: "users.license_id",
  },
  "0015_science_junction_tables": {
    tag: "0015_science_junction_tables",
    kind: "table",
    target: "science_unit_lessons",
  },
  "0016_users_grade_level": {
    tag: "0016_users_grade_level",
    kind: "column",
    target: "users.grade_level",
  },
  "0017_science_school_id": {
    tag: "0017_science_school_id",
    kind: "column",
    target: "gamification_profiles.school_id",
  },
  "0018_audit_events": {
    tag: "0018_audit_events",
    kind: "table",
    target: "audit_events",
  },
  "0019_session_token_hash": {
    tag: "0019_session_token_hash",
    kind: "column",
    target: "sessions.token_hash",
  },
  "0020_sessions_indexes": {
    tag: "0020_sessions_indexes",
    kind: "table",
    target: "sessions",
  },
  "0021_sales_advantage": {
    tag: "0021_sales_advantage",
    kind: "table",
    target: "sales_modules",
  },
  "0022_flowery_black_tarantula": {
    tag: "0022_flowery_black_tarantula",
    kind: "table",
    target: "article_activity_logs",
  },
  "0023_cultured_sunspot": {
    tag: "0023_cultured_sunspot",
    kind: "column",
    target: "sales_roleplay_attempts.audio_storage_key",
  },
  "0024_futuristic_vulture": {
    tag: "0024_futuristic_vulture",
    kind: "table",
    target: "login_attempts",
  },
  "0025_review_jobs": {
    tag: "0025_review_jobs",
    kind: "table",
    target: "review_jobs",
  },
  "0026_game_completions": {
    tag: "0026_game_completions",
    kind: "table",
    target: "game_completions",
  },
  "0027_mastery_persistence": {
    tag: "0027_mastery_persistence",
    kind: "table",
    target: "mastery_commits",
  },
  "0028_mastery_tenant_hardening": {
    tag: "0028_mastery_tenant_hardening",
    kind: "table",
    target: "mastery_cards",
  },
  "0029_activity_sessions": {
    tag: "0029_activity_sessions",
    kind: "table",
    target: "activity_sessions",
  },
  "0030_activity_tutorial_reporting": {
    tag: "0030_activity_tutorial_reporting",
    kind: "table",
    target: "activity_tutorial_reports",
  },
  "0031_tutorial_claim_fencing": {
    tag: "0031_tutorial_claim_fencing",
    kind: "column",
    target: "activity_tutorial_reports.claim_token",
  },
  "0032_tutorial_snapshot_submission_binding": {
    tag: "0032_tutorial_snapshot_submission_binding",
    kind: "column",
    target: "activity_tutorial_repository_states.submission_id",
  },
  "0033_codecamp_curriculum_assignments": {
    tag: "0033_codecamp_curriculum_assignments",
    kind: "table",
    target: "codecamp_curriculum_assignments",
  },
  "0034_codecamp_pr_rubric_evaluation": {
    tag: "0034_codecamp_pr_rubric_evaluation",
    kind: "column",
    target: "codecamp_pr_reviews.rubric_evaluation_json",
  },
  "0035_activity_tutorial_capture_leases": {
    tag: "0035_activity_tutorial_capture_leases",
    kind: "table",
    target: "activity_tutorial_capture_leases",
  },
  "0036_codecamp_mastery_evidence": {
    tag: "0036_codecamp_mastery_evidence",
    kind: "table",
    target: "codecamp_pr_review_attempts",
  },
  "0037_sales_roleplay_attempt_number_unique": {
    tag: "0037_sales_roleplay_attempt_number_unique",
    kind: "table",
    target: "sales_roleplay_attempts",
  },
  "0038_capability_idempotency_records": {
    tag: "0038_capability_idempotency_records",
    kind: "table",
    target: "capability_idempotency_records",
  },
  "0039_sales_progress_activity_timestamp": {
    tag: "0039_sales_progress_activity_timestamp",
    kind: "column",
    target: "sales_progress.updated_at",
  },
  "0040_company_product_principals": {
    tag: "0040_company_product_principals",
    kind: "table",
    target: "company_product_principals",
  },
};
