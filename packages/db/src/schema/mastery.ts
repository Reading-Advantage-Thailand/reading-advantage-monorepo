import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { schools, users } from "./users.js";

/** School-scoped FSRS card state for one student objective variant. */
export const masteryCards = pgTable(
  "mastery_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull(),
    objectiveId: text("objective_id").notNull(),
    variantKey: text("variant_key").notNull(),
    stability: real("stability").notNull(),
    difficulty: real("difficulty").notNull(),
    state: text("state").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    elapsedDays: real("elapsed_days").notNull(),
    scheduledDays: real("scheduled_days").notNull(),
    reps: integer("reps").notNull(),
    lapses: integer("lapses").notNull(),
    lastReview: timestamp("last_review", { withTimezone: true }),
    paramsVersion: text("params_version").notNull(),
    revision: integer("revision").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("mastery_cards_school_id_unique").on(table.schoolId, table.id),
    unique("mastery_cards_school_id_student_id_unique").on(
      table.schoolId,
      table.id,
      table.studentId,
    ),
    unique("mastery_cards_school_student_objective_variant_unique").on(
      table.schoolId,
      table.studentId,
      table.objectiveId,
      table.variantKey,
    ),
    foreignKey({
      name: "mastery_cards_school_student_fk",
      columns: [table.schoolId, table.studentId],
      foreignColumns: [users.schoolId, users.id],
    }).onDelete("cascade"),
    check(
      "mastery_cards_numeric_bounds_check",
      sql`${table.stability} >= 0 AND ${table.difficulty} >= 0 AND ${table.difficulty} <= 10 AND ${table.elapsedDays} >= 0 AND ${table.scheduledDays} >= 0 AND ${table.reps} >= 0 AND ${table.lapses} >= 0 AND ${table.revision} >= 0 AND ${table.state} IN ('new', 'learning', 'review', 'relearning')`,
    ),
    index("mastery_cards_school_student_due_idx").on(
      table.schoolId,
      table.studentId,
      table.dueDate,
    ),
    index("mastery_cards_school_objective_idx").on(
      table.schoolId,
      table.objectiveId,
    ),
  ],
);

/** Immutable school-scoped review event and before/after scheduler audit. */
export const masteryReviews = pgTable(
  "mastery_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    cardId: uuid("card_id").notNull(),
    studentId: text("student_id").notNull(),
    submissionId: text("submission_id").notNull(),
    rating: text("rating").notNull(),
    evidenceJson: jsonb("evidence_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    stateBeforeJson: jsonb("state_before_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    stateAfterJson: jsonb("state_after_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    paramsVersion: text("params_version").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("mastery_reviews_school_id_unique").on(table.schoolId, table.id),
    unique("mastery_reviews_school_id_student_id_unique").on(
      table.schoolId,
      table.id,
      table.studentId,
    ),
    unique("mastery_reviews_school_card_submission_unique").on(
      table.schoolId,
      table.cardId,
      table.submissionId,
    ),
    foreignKey({
      name: "mastery_reviews_school_student_fk",
      columns: [table.schoolId, table.studentId],
      foreignColumns: [users.schoolId, users.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "mastery_reviews_school_card_student_fk",
      columns: [table.schoolId, table.cardId, table.studentId],
      foreignColumns: [
        masteryCards.schoolId,
        masteryCards.id,
        masteryCards.studentId,
      ],
    }).onDelete("cascade"),
    check(
      "mastery_reviews_rating_check",
      sql`${table.rating} IN ('again', 'hard', 'good', 'easy')`,
    ),
    index("mastery_reviews_school_student_reviewed_idx").on(
      table.schoolId,
      table.studentId,
      table.reviewedAt,
    ),
    index("mastery_reviews_school_card_reviewed_idx").on(
      table.schoolId,
      table.cardId,
      table.reviewedAt,
    ),
  ],
);

/** Validated proficiency evidence attributed to one immutable review. */
export const masteryEvidence = pgTable(
  "mastery_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id").notNull(),
    studentId: text("student_id").notNull(),
    objectiveId: text("objective_id").notNull(),
    variantKey: text("variant_key").notNull(),
    sourceId: text("source_id").notNull(),
    evidenceOrdinal: integer("evidence_ordinal").notNull(),
    evidenceType: text("evidence_type").notNull(),
    retentionStrength: real("retention_strength").notNull(),
    practiceCoverage: real("practice_coverage").notNull(),
    evidenceConfidence: real("evidence_confidence").notNull(),
    attemptCount: integer("attempt_count").notNull(),
    provenanceJson: jsonb("provenance_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("mastery_evidence_school_source_ordinal_unique").on(
      table.schoolId,
      table.sourceId,
      table.evidenceOrdinal,
    ),
    foreignKey({
      name: "mastery_evidence_school_student_fk",
      columns: [table.schoolId, table.studentId],
      foreignColumns: [users.schoolId, users.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "mastery_evidence_school_review_student_fk",
      columns: [table.schoolId, table.reviewId, table.studentId],
      foreignColumns: [
        masteryReviews.schoolId,
        masteryReviews.id,
        masteryReviews.studentId,
      ],
    }).onDelete("cascade"),
    check(
      "mastery_evidence_bounds_check",
      sql`${table.evidenceOrdinal} >= 0 AND ${table.retentionStrength} >= 0 AND ${table.retentionStrength} <= 1 AND ${table.practiceCoverage} >= 0 AND ${table.practiceCoverage} <= 1 AND ${table.evidenceConfidence} >= 0 AND ${table.evidenceConfidence} <= 1 AND ${table.attemptCount} >= 0`,
    ),
    index("mastery_evidence_school_student_objective_observed_idx").on(
      table.schoolId,
      table.studentId,
      table.objectiveId,
      table.observedAt,
    ),
    index("mastery_evidence_school_source_idx").on(
      table.schoolId,
      table.sourceId,
    ),
  ],
);

/** Current objective-level mastery projection with optimistic revision. */
export const masteryStates = pgTable(
  "mastery_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull(),
    objectiveId: text("objective_id").notNull(),
    masteryState: text("mastery_state").notNull(),
    masteryLevel: real("mastery_level").notNull(),
    liveRetention: real("live_retention").notNull(),
    evidenceConfidence: real("evidence_confidence").notNull(),
    graphRelease: text("graph_release").notNull(),
    revision: integer("revision").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("mastery_states_school_student_objective_unique").on(
      table.schoolId,
      table.studentId,
      table.objectiveId,
    ),
    foreignKey({
      name: "mastery_states_school_student_fk",
      columns: [table.schoolId, table.studentId],
      foreignColumns: [users.schoolId, users.id],
    }).onDelete("cascade"),
    check(
      "mastery_states_bounds_check",
      sql`${table.masteryLevel} >= 0 AND ${table.masteryLevel} <= 1 AND ${table.liveRetention} >= 0 AND ${table.liveRetention} <= 1 AND ${table.evidenceConfidence} >= 0 AND ${table.evidenceConfidence} <= 1 AND ${table.revision} >= 0 AND ${table.masteryState} IN ('unseen', 'introduced', 'practicing', 'proficient', 'mastered')`,
    ),
    index("mastery_states_school_student_idx").on(
      table.schoolId,
      table.studentId,
    ),
    index("mastery_states_school_objective_idx").on(
      table.schoolId,
      table.objectiveId,
    ),
  ],
);

/** Placement estimate and direct/inferred evidence provenance. */
export const masteryPlacements = pgTable(
  "mastery_placements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull(),
    objectiveId: text("objective_id").notNull(),
    masteryEstimate: real("mastery_estimate").notNull(),
    confidence: text("confidence").notNull(),
    evidenceType: text("evidence_type").notNull(),
    graphRelease: text("graph_release").notNull(),
    sourceId: text("source_id").notNull(),
    seedProvenanceJson: jsonb("seed_provenance_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    replacedByDirectAt: timestamp("replaced_by_direct_at", {
      withTimezone: true,
    }),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("mastery_placements_school_student_objective_release_type_unique").on(
      table.schoolId,
      table.studentId,
      table.objectiveId,
      table.graphRelease,
      table.evidenceType,
    ),
    foreignKey({
      name: "mastery_placements_school_student_fk",
      columns: [table.schoolId, table.studentId],
      foreignColumns: [users.schoolId, users.id],
    }).onDelete("cascade"),
    check(
      "mastery_placements_bounds_check",
      sql`${table.masteryEstimate} >= 0 AND ${table.masteryEstimate} <= 1 AND ${table.confidence} IN ('low', 'medium', 'high')`,
    ),
    index("mastery_placements_school_student_objective_idx").on(
      table.schoolId,
      table.studentId,
      table.objectiveId,
    ),
    index("mastery_placements_school_graph_release_idx").on(
      table.schoolId,
      table.graphRelease,
    ),
  ],
);

/** Versioned FSRS calibration artifact with mechanical and human gates. */
export const masteryCalibrations = pgTable(
  "mastery_calibrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    ageBand: text("age_band").notNull(),
    paramsVersion: text("params_version").notNull(),
    optimizerVersion: text("optimizer_version").notNull(),
    incumbentParamsVersion: text("incumbent_params_version").notNull(),
    fsrsParametersJson: jsonb("fsrs_parameters_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    reviewCount: integer("review_count").notNull(),
    studentCount: integer("student_count").notNull(),
    volumeGatePassed: boolean("volume_gate_passed").notNull(),
    improvesIncumbent: boolean("improves_incumbent").notNull(),
    humanReleaseApproved: boolean("human_release_approved").notNull(),
    releaseEligible: boolean("release_eligible").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("mastery_calibrations_school_population_version_unique").on(
      table.schoolId,
      table.domain,
      table.ageBand,
      table.paramsVersion,
    ),
    check(
      "mastery_calibrations_release_governance_check",
      sql`${table.reviewCount} >= 0 AND ${table.studentCount} >= 0 AND (NOT ${table.releaseEligible} OR (${table.volumeGatePassed} AND ${table.improvesIncumbent} AND ${table.humanReleaseApproved}))`,
    ),
    index("mastery_calibrations_school_population_idx").on(
      table.schoolId,
      table.domain,
      table.ageBand,
    ),
  ],
);

/** Idempotency receipt and immutable audit result for one atomic commit. */
export const masteryCommits = pgTable(
  "mastery_commits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestId: text("request_id").notNull(),
    actorId: text("actor_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    contractVersion: text("contract_version").notNull(),
    graphRelease: text("graph_release").notNull(),
    paramsVersion: text("params_version").notNull(),
    status: text("status").notNull(),
    resultDigest: text("result_digest").notNull(),
    resultJson: jsonb("result_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("mastery_commits_school_idempotency_unique").on(
      table.schoolId,
      table.idempotencyKey,
    ),
    foreignKey({
      name: "mastery_commits_school_student_fk",
      columns: [table.schoolId, table.studentId],
      foreignColumns: [users.schoolId, users.id],
    }).onDelete("cascade"),
    check(
      "mastery_commits_status_check",
      sql`${table.status} = 'applied'`,
    ),
    index("mastery_commits_school_student_created_idx").on(
      table.schoolId,
      table.studentId,
      table.createdAt,
    ),
    index("mastery_commits_school_request_idx").on(
      table.schoolId,
      table.requestId,
    ),
  ],
);
