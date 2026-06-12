/**
 * Sentinel-probe map for the migration ledger doctor.
 *
 * Each entry maps a journal tag to a cheap schema sentinel — a table or column
 * existence check via `information_schema` — that proves the migration was applied.
 *
 * Doctor exit codes:
 *   0 — clean: all sentinels match their journal entries
 *   1 — divergence: one or more sentinels disagree with the journal (applied without
 *       ledger entry, or ledger entry present but sentinel missing)
 *   2 — connection/config error: unable to reach the database or read required files
 */

export interface SentinelProbe {
  /** The journal tag (e.g. "0000_wide_vengeance") */
  tag: string;
  /** "table" | "column" — determines the information_schema query */
  kind: "table" | "column";
  /** For kind "table": the table name. For kind "column": "table.column" */
  target: string;
}

/**
 * Typed sentinel-probe map covering every journal entry 0000..0018.
 *
 * Derivation: for each migration, pick one table or column that is created/altered
 * as the cheapest proof that the migration ran.
 */
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
};
