/**
 * Table classification registry for TenantDB multi-tenancy enforcement.
 *
 * Every Drizzle table MUST be classified as exactly one of:
 * - FLAT: has a `schoolId` column; TenantDB auto-injects `eq(table.schoolId, tenant.schoolId)`.
 * - EXEMPT: intentionally global (audit events, schools, auth infra); no tenant scoping.
 * - REFERENTIAL: tenant data scoped via an owner FK (no `schoolId` column);
 *   querying through TenantDB throws — use `tenantDb.unscoped(reason)` instead.
 *
 * Adding a table without classifying it here is a build failure (FR-6 coverage test).
 */

import type { PgTable } from "drizzle-orm/pg-core";

/** Classification for a table's tenant-scoping behavior. */
export type TableClassification = "FLAT" | "EXEMPT" | "REFERENTIAL";

/** O(1) lookup: table identity → classification. */
const classificationMap = new Map<object, TableClassification>();

/**
 * Register a table with its classification. Called once per table at module load.
 * @param table - The Drizzle table object
 * @param classification - FLAT, EXEMPT, or REFERENTIAL
 */
function register(table: PgTable, classification: TableClassification): void {
  classificationMap.set(table, classification);
}

/**
 * Classify a table for tenant scoping.
 * @param table - The Drizzle table object to look up
 * @returns The table's classification
 * @throws If the table is not registered (fail-closed on unclassified tables — FR-2)
 */
export function classifyTable(table: unknown): TableClassification {
  const result = classificationMap.get(table as object);
  if (result === undefined) {
    const tableName =
      table && typeof table === "object"
        ? String((table as Record<string | symbol, unknown>)[Symbol.for("drizzle:Name")] ?? "unknown")
        : "unknown";
    throw new Error(
      `[TenantDB] Table "${tableName}" is not classified in the tenant registry. ` +
        `Add it to packages/domain/src/tenant-registry.ts as FLAT, EXEMPT, or REFERENTIAL.`
    );
  }
  return result;
}

// ─── FLAT tables (have schoolId column) ─────────────────────

import {
  users,
  classrooms,
  licenses,
  gamificationProfiles,
  achievements,
  scienceClasses,
  scienceStandards,
  scienceStandardMastery,
  scienceLessons,
  scienceCurriculumUnits,
  scienceQuizQuestions,
  scienceAttempts,
  scienceQuestionResponses,
  scienceLessonCompletions,
  scienceMasteryRuns,
  scienceAssignments,
  scienceLessonStandards,
  scienceUnitLessons,
  scienceClassStudents,
  scienceQuestionStandards,
  schoolAdmins,
  leaderboards,
} from "@reading-advantage/db";

register(users, "FLAT");
register(classrooms, "FLAT");
register(licenses, "FLAT");
register(gamificationProfiles, "FLAT");
register(achievements, "FLAT");
register(scienceClasses, "FLAT");
register(scienceStandards, "FLAT");
register(scienceStandardMastery, "FLAT");
register(scienceLessons, "FLAT");
register(scienceCurriculumUnits, "FLAT");
register(scienceQuizQuestions, "FLAT");
register(scienceAttempts, "FLAT");
register(scienceQuestionResponses, "FLAT");
register(scienceLessonCompletions, "FLAT");
register(scienceMasteryRuns, "FLAT");
register(scienceAssignments, "FLAT");
register(scienceLessonStandards, "FLAT");
register(scienceUnitLessons, "FLAT");
register(scienceClassStudents, "FLAT");
register(scienceQuestionStandards, "FLAT");

// primary-advantage additions (track_id: primary_advantage_drizzle_migration_20260526).
// Both have a `schoolId` column and are school-scoped.
register(schoolAdmins, "FLAT");
register(leaderboards, "FLAT");

// ─── EXEMPT tables (intentionally global) ───────────────────

import {
  auditEvents,
  schools,
  accounts,
  sessions,
  verificationTokens,
  roles,
  loginAttempts,
} from "@reading-advantage/db";

// auth infrastructure — identifier/token/expires; not scoped to a school.
register(verificationTokens, "EXEMPT");
// global role catalog (custom-named roles); distinct from the per-user `roleEnum`.
// Looked up by id from `userRoles`; not school-scoped.
register(roles, "EXEMPT");

register(auditEvents, "EXEMPT");
register(schools, "EXEMPT");
register(accounts, "EXEMPT");
register(sessions, "EXEMPT");
register(loginAttempts, "EXEMPT");

// ─── REFERENTIAL tables (tenant data via owner FK, no schoolId) ──

import {
  xpLogs,
  gameRankings,
  aiInsights,
  aiInsightCache,
  learningGoals,
  goalMilestones,
  goalProgressLogs,
  classroomStudents,
  classroomTeachers,
  codecampModules,
  codecampLessons,
  codecampExercises,
  codecampQuizQuestions,
  codecampUserProgress,
  codecampChatConversations,
  codecampChatMessages,
  codecampExerciseRepos,
  codecampPrReviews,
  codecampWebhookEvents,
  reviewJobs,
  articles,
  lessons,
  assignments,
  studentAssignments,
  flashcardDecks,
  flashcardCards,
  flashcardProgress,
  licenseOnUsers,
  userActivity,
  userWordRecords,
  userSentenceRecords,
  lessonProgress,
  multipleChoiceQuestions,
  shortAnswerQuestions,
  longAnswerQuestions,
  studentAnswers,
  stories,
  chapters,
  storyTimepoints,
  storyRecords,
  chapterTrackings,
  storyAssignments,
  lessonRecords,
  assignmentNotifications,
  raCefrMappings,
  genreAdjacencies,
  userRoles,
  articleActivityLogs,
  sentencsAndWordsForFlashcards,
  cardReviews,
  clozeTestGames,
  salesModules,
  salesLessons,
  salesRubrics,
  salesRoleplayScenarios,
  salesQuizQuestions,
  salesRoleplayAttempts,
  salesProgress,
  salesConversations,
  salesChatMessages,
  campaigns,
  videoProjects,
  videoAssets,
  pastTopics,
  settings,
} from "@reading-advantage/db";

register(xpLogs, "REFERENTIAL");
register(gameRankings, "REFERENTIAL");
register(aiInsights, "REFERENTIAL");
register(aiInsightCache, "REFERENTIAL");
register(learningGoals, "REFERENTIAL");
register(goalMilestones, "REFERENTIAL");
register(goalProgressLogs, "REFERENTIAL");
register(classroomStudents, "REFERENTIAL");
register(classroomTeachers, "REFERENTIAL");
register(codecampModules, "REFERENTIAL");
register(codecampLessons, "REFERENTIAL");
register(codecampExercises, "REFERENTIAL");
register(codecampQuizQuestions, "REFERENTIAL");
register(codecampUserProgress, "REFERENTIAL");
register(codecampChatConversations, "REFERENTIAL");
register(codecampChatMessages, "REFERENTIAL");
register(codecampExerciseRepos, "REFERENTIAL");
register(codecampPrReviews, "REFERENTIAL");
register(codecampWebhookEvents, "REFERENTIAL");
// review_jobs queue (track_id: webhook_review_reliability_20260605) — codecamp
// is single-tenant/global; review_jobs has no `schoolId`. Accessed via
// `tenantDb.unscoped("review_jobs has no schoolId; codecamp is global")`.
register(reviewJobs, "REFERENTIAL");
register(articles, "REFERENTIAL");
register(lessons, "REFERENTIAL");
register(assignments, "REFERENTIAL");
register(studentAssignments, "REFERENTIAL");
register(flashcardDecks, "REFERENTIAL");
register(flashcardCards, "REFERENTIAL");
register(flashcardProgress, "REFERENTIAL");
register(licenseOnUsers, "REFERENTIAL");
register(userActivity, "REFERENTIAL");
register(userWordRecords, "REFERENTIAL");
register(userSentenceRecords, "REFERENTIAL");
register(lessonProgress, "REFERENTIAL");
register(multipleChoiceQuestions, "REFERENTIAL");
register(shortAnswerQuestions, "REFERENTIAL");
register(longAnswerQuestions, "REFERENTIAL");
register(studentAnswers, "REFERENTIAL");
register(stories, "REFERENTIAL");
register(chapters, "REFERENTIAL");
register(storyTimepoints, "REFERENTIAL");
register(storyRecords, "REFERENTIAL");
register(chapterTrackings, "REFERENTIAL");
register(storyAssignments, "REFERENTIAL");
register(lessonRecords, "REFERENTIAL");
register(assignmentNotifications, "REFERENTIAL");
register(raCefrMappings, "REFERENTIAL");
register(genreAdjacencies, "REFERENTIAL");

// primary-advantage additions (track_id: primary_advantage_drizzle_migration_20260526).
// Tenant data scoped via owner FKs (userId/articleId/cardId); no `schoolId` column.
// Accessed via tenantDb.unscoped("reason") + owner-FK joins.
register(userRoles, "REFERENTIAL");
register(articleActivityLogs, "REFERENTIAL");
register(sentencsAndWordsForFlashcards, "REFERENTIAL");
register(cardReviews, "REFERENTIAL");
register(clozeTestGames, "REFERENTIAL");

// sales-advantage: single-tenant/global — tables have no schoolId; user-scoped by userId.
// Accessed via tenantDb.unscoped("sales-advantage tables have no schoolId").
register(salesModules, "REFERENTIAL");
register(salesLessons, "REFERENTIAL");
register(salesRubrics, "REFERENTIAL");
register(salesRoleplayScenarios, "REFERENTIAL");
register(salesQuizQuestions, "REFERENTIAL");
register(salesRoleplayAttempts, "REFERENTIAL");
register(salesProgress, "REFERENTIAL");
register(salesConversations, "REFERENTIAL");
register(salesChatMessages, "REFERENTIAL");

// marketing-advantage: single-tenant/global — tables have no schoolId.
// Pre-existing gap from the marketing_tables migration (0021); registered here
// so the tenant-coverage gate passes. Accessed via tenantDb.unscoped().
register(campaigns, "REFERENTIAL");
register(videoProjects, "REFERENTIAL");
register(videoAssets, "REFERENTIAL");
register(pastTopics, "REFERENTIAL");
register(settings, "REFERENTIAL");
