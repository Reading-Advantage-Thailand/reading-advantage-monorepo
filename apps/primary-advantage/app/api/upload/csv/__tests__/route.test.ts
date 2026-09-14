// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  // Inert stubs for every other @reading-advantage/db table export. Some
  // transitively loaded @reading-advantage/auth modules import table exports
  // from this barrel at load time; the route never queries through them.
  const inertTables = Object.fromEntries(
    [
      "accounts", "achievements", "activitySessionEvents", "activitySessions", "activityTutorialCaptureLeases",
      "activityTutorialReports", "activityTutorialRepositoryStates", "aiInsightCache", "aiInsights", "articleActivityLogs",
      "articles", "assignmentNotifications", "assignments", "auditEvents", "campaigns",
      "capabilityIdempotencyRecords", "cardReviews", "chapterTrackings", "chapters", "clozeTestGames",
      "codecampChatConversations", "codecampChatMessages", "codecampCurriculumAssignments", "codecampExerciseRepos", "codecampExercises",
      "codecampLessons", "codecampModules", "codecampPrReviewAttempts", "codecampPrReviewObjectiveEvidence", "codecampPrReviews",
      "codecampQuizQuestions", "codecampTutorEvidenceJoins", "codecampTutorInterventions", "codecampTutorResourceUses", "codecampUserProgress",
      "codecampWebhookEvents", "companyProductPrincipals", "durableJobAuditEvents", "durableJobs", "flashcardCards",
      "flashcardDecks", "flashcardProgress", "gameChallengeContributions", "gameChallengeDefinitions", "gameChallengeRuns",
      "gameCompletions", "gameRankings", "gamificationProfiles", "genreAdjacencies", "goalMilestones",
      "goalProgressLogs", "hostProofAttempts", "leaderboards", "learningGoals", "lessonProgress",
      "lessonRecords", "lessons", "licenseOnUsers", "licenses", "loginAttempts",
      "longAnswerQuestions", "masteryCalibrations", "masteryCards", "masteryCommits", "masteryEvidence",
      "masteryPlacements", "masteryPrincipals", "masteryReviews", "masteryStates", "multipleChoiceQuestions",
      "pastTopics", "raCefrMappings", "reviewJobAdoptionAuditEvents", "reviewJobDurableAdoption", "reviewJobDurableBindings",
      "reviewJobMigrationIssues", "reviewJobs", "salesChatMessages", "salesConversations", "salesLessons",
      "salesMasteryProjectionOutbox", "salesMasteryProjectionReceipts", "salesMasteryTenantMappings", "salesModules", "salesProgress",
      "salesQuizQuestions", "salesRoleplayAttempts", "salesRoleplayScenarios", "salesRubrics", "schoolAdmins",
      "scienceAssignments", "scienceAttempts", "scienceClassStudents", "scienceClasses", "scienceCurriculumUnits",
      "scienceLessonCompletions", "scienceLessonStandards", "scienceLessons", "scienceMasteryRuns", "scienceQuestionResponses",
      "scienceQuestionStandards", "scienceQuizQuestions", "scienceStandardMastery", "scienceStandards", "scienceUnitLessons",
      "sentencsAndWordsForFlashcards", "sessions", "settings", "shortAnswerQuestions", "standardPackSuccessorAdmissionReceipts",
      "standardPackSuccessorCommitments", "stories", "storyAssignments", "storyRecords", "storyTimepoints",
      "studentAnswers", "studentAssignments", "studentCosmeticUnlocks", "studentRpgProfiles", "userActivity",
      "userSentenceRecords", "userWordRecords", "verificationTokens", "videoAssets", "videoProjects",
      "workbookDrafts", "workbookEditions", "workbookPublicationEvents", "xpLogs",
    ].map((name) => [name, {}]),
  );
  const tables = {
    ...inertTables,
    users: { id: "users.id" },
    schools: { id: "schools.id", name: "schools.name" },
    roles: {},
    classrooms: {},
    classroomStudents: {},
    classroomTeachers: {},
    userRoles: {},
  };
  return { currentUser: vi.fn(), select: vi.fn(), insert: vi.fn(), tables };
});

vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.currentUser }));
// The route reads its db handle from getTenantDB/getUnscopedDB in
// @reading-advantage/domain, which import the shared client from this barrel;
// the `db` export below is that client. Tables come from
// @reading-advantage/db/schema and operators from drizzle-orm (both real), so
// identity assertions target the real schema exports.
vi.mock("@reading-advantage/db", () => ({
  db: { select: mocks.select, insert: mocks.insert },
  ...mocks.tables,
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  or: vi.fn(() => ({})),
  ilike: vi.fn(() => ({})),
  gt: vi.fn(() => ({})),
  count: vi.fn(() => ({})),
}));

import { schools } from "@reading-advantage/db/schema";
import { POST } from "../route";

function selectResult(rows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

const request = {
  formData: vi.fn().mockResolvedValue({ get: () => null }),
} as unknown as NextRequest;

describe("user CSV upload authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The migrated route denies students before any DB read, so the denied
    // test's queued select result is never consumed. mockReset clears the
    // mockReturnValueOnce queue (clearAllMocks alone does not) and keeps each
    // test's queue isolated. vi.fn() defaults carry no implementation to lose.
    mocks.select.mockReset();
    mocks.insert.mockReset();
  });

  it("denies a student before any write", async () => {
    mocks.currentUser.mockResolvedValue({ id: "student-1", role: "STUDENT" });
    mocks.select.mockReturnValueOnce(selectResult([{ id: "student-1", schoolId: null }]));

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("allows a teacher and reads the school from the schools table", async () => {
    const schoolId = "00000000-0000-0000-0000-000000000001";
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER" });
    mocks.select
      .mockReturnValueOnce(selectResult([{ id: "teacher-1", schoolId }]))
      .mockReturnValueOnce(selectResult([{ id: schoolId, name: "School A" }]));

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mocks.select.mock.results[1]?.value.from).toHaveBeenCalledWith(
      schools,
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("allows a system actor without a school", async () => {
    mocks.currentUser.mockResolvedValue({ id: "system-1", role: "SYSTEM" });
    mocks.select.mockReturnValueOnce(selectResult([{ id: "system-1", schoolId: null }]));

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
