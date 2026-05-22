// Schema parity test — asserts every Prisma model classified as PORT or UNIFY in audit.md
// exists in the Drizzle schema with expected columns.
import { describe, it, expect } from "vitest";
import * as schema from "../schema/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cols(table: any): string[] {
  return Object.keys(table as Record<string, unknown>).filter((k) => !k.startsWith("_"));
}

// ─── Reading-advantage: existing tables (PORT+RESHAPE) ────────────────────────

describe("articles — PORT+RESHAPE", () => {
  it("has Drizzle-original columns", () => {
    const c = cols(schema.articles);
    expect(c).toContain("id");
    expect(c).toContain("title");
    expect(c).toContain("content");
    expect(c).toContain("level");
    expect(c).toContain("cefrLevel");
    expect(c).toContain("published");
  });
  it("has Prisma-ported columns", () => {
    const c = cols(schema.articles);
    expect(c).toContain("type");
    expect(c).toContain("genre");
    expect(c).toContain("subGenre");
    expect(c).toContain("passage");
    expect(c).toContain("translatedSummary");
    expect(c).toContain("translatedPassage");
    expect(c).toContain("imageDescription");
    expect(c).toContain("raLevel");
    expect(c).toContain("rating");
    expect(c).toContain("audioUrl");
    expect(c).toContain("audioWordUrl");
    expect(c).toContain("sentences");
    expect(c).toContain("words");
    expect(c).toContain("authorId");
    expect(c).toContain("isPublic");
  });
});

describe("classrooms — PORT+RESHAPE", () => {
  it("has Prisma-ported columns", () => {
    const c = cols(schema.classrooms);
    expect(c).toContain("classCode");
    expect(c).toContain("codeExpiresAt");
    expect(c).toContain("grade");
    expect(c).toContain("createdBy");
  });
});

describe("schools — PORT+RESHAPE", () => {
  it("has Prisma-ported columns", () => {
    const c = cols(schema.schools);
    expect(c).toContain("province");
    expect(c).toContain("country");
  });
});

describe("userActivity — PORT+RESHAPE", () => {
  it("has Prisma-ported columns", () => {
    const c = cols(schema.userActivity);
    expect(c).toContain("targetId");
    expect(c).toContain("timer");
    expect(c).toContain("details");
    expect(c).toContain("completed");
  });
});

describe("multipleChoiceQuestions — PORT+RESHAPE", () => {
  it("has Prisma-ported columns", () => {
    const c = cols(schema.multipleChoiceQuestions);
    expect(c).toContain("answer");
    expect(c).toContain("textualEvidence");
    expect(c).toContain("chapterId");
  });
});

describe("shortAnswerQuestions — PORT+RESHAPE", () => {
  it("has Prisma-ported columns", () => {
    const c = cols(schema.shortAnswerQuestions);
    expect(c).toContain("answer");
    expect(c).toContain("chapterId");
  });
});

describe("assignments — PORT+RESHAPE", () => {
  it("has Prisma-ported columns", () => {
    const c = cols(schema.assignments);
    expect(c).toContain("description");
  });
});

describe("studentAssignments — PORT+RESHAPE", () => {
  it("has Prisma-ported columns", () => {
    const c = cols(schema.studentAssignments);
    expect(c).toContain("status");
    expect(c).toContain("startedAt");
  });
});

// ─── Reading-advantage: new tables (PORT-AS-IS) ───────────────────────────────

describe("licenses — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.licenses).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.licenses);
    expect(c).toContain("id");
    expect(c).toContain("key");
    expect(c).toContain("licenseType");
    expect(c).toContain("maxUsers");
    expect(c).toContain("schoolName");
    expect(c).toContain("expiresAt");
    expect(c).toContain("featureFlags");
  });
});

describe("licenseOnUsers — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.licenseOnUsers).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.licenseOnUsers);
    expect(c).toContain("userId");
    expect(c).toContain("licenseId");
    expect(c).toContain("activateAt");
  });
});

describe("stories — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.stories).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.stories);
    expect(c).toContain("id");
    expect(c).toContain("title");
    expect(c).toContain("raLevel");
    expect(c).toContain("cefrLevel");
    expect(c).toContain("isPublic");
    expect(c).toContain("storyBible");
  });
});

describe("chapters — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.chapters).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.chapters);
    expect(c).toContain("id");
    expect(c).toContain("storyId");
    expect(c).toContain("chapterNumber");
    expect(c).toContain("title");
    expect(c).toContain("cefrLevel");
    expect(c).toContain("raLevel");
  });
});

describe("storyTimepoints — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.storyTimepoints).toBeDefined();
  });
});

describe("storyAssignments — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.storyAssignments).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.storyAssignments);
    expect(c).toContain("classroomId");
    expect(c).toContain("storyId");
    expect(c).toContain("status");
  });
});

describe("lessonRecords — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.lessonRecords).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.lessonRecords);
    expect(c).toContain("userId");
    expect(c).toContain("articleId");
    expect(c).toContain("phase1");
    expect(c).toContain("phase14");
  });
});

describe("raCefrMappings — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.raCefrMappings).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.raCefrMappings);
    expect(c).toContain("raLevel");
    expect(c).toContain("cefrLevel");
  });
});

describe("genreAdjacencies — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.genreAdjacencies).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.genreAdjacencies);
    expect(c).toContain("primaryGenre");
    expect(c).toContain("adjacentGenre");
    expect(c).toContain("weight");
  });
});

describe("longAnswerQuestions — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.longAnswerQuestions).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.longAnswerQuestions);
    expect(c).toContain("question");
    expect(c).toContain("articleId");
    expect(c).toContain("chapterId");
  });
});

describe("assignmentNotifications — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.assignmentNotifications).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.assignmentNotifications);
    expect(c).toContain("teacherId");
    expect(c).toContain("studentId");
    expect(c).toContain("assignmentId");
    expect(c).toContain("isNoticed");
  });
});

describe("aiInsightCache — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.aiInsightCache).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.aiInsightCache);
    expect(c).toContain("cacheKey");
    expect(c).toContain("scope");
    expect(c).toContain("insights");
    expect(c).toContain("expiresAt");
  });
});

describe("goalMilestones — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.goalMilestones).toBeDefined();
  });
});

describe("goalProgressLogs — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.goalProgressLogs).toBeDefined();
  });
});

// ─── Reading-advantage: RESHAPE tables ───────────────────────────────────────

describe("xpLogs — RESHAPE", () => {
  it("has Prisma column names (not old Drizzle names)", () => {
    const c = cols(schema.xpLogs);
    expect(c).toContain("xpEarned");
    expect(c).toContain("activityId");
    expect(c).toContain("activityType");
    expect(c).not.toContain("amount");
    expect(c).not.toContain("source");
    expect(c).not.toContain("sourceId");
  });
});

describe("storyRecords — RESHAPE", () => {
  it("has Prisma column names (not old Drizzle names)", () => {
    const c = cols(schema.storyRecords);
    expect(c).toContain("storyId");
    expect(c).toContain("status");
    expect(c).toContain("rated");
    expect(c).toContain("score");
    expect(c).not.toContain("articleId");
    expect(c).not.toContain("completed");
    expect(c).not.toContain("currentChapter");
    expect(c).not.toContain("totalChapters");
  });
});

describe("chapterTrackings — RESHAPE (SQL name fixed)", () => {
  it("is exported as chapterTrackings", () => {
    expect(schema.chapterTrackings).toBeDefined();
  });
  it("has Prisma column names", () => {
    const c = cols(schema.chapterTrackings);
    expect(c).toContain("userId");
    expect(c).toContain("storyId");
    expect(c).toContain("chapterNumber");
    expect(c).toContain("status");
    expect(c).not.toContain("storyRecordId");
  });
});

describe("userWordRecords — RESHAPE (FSRS)", () => {
  it("has FSRS columns", () => {
    const c = cols(schema.userWordRecords);
    expect(c).toContain("word");
    expect(c).toContain("difficulty");
    expect(c).toContain("due");
    expect(c).toContain("lapses");
    expect(c).toContain("reps");
    expect(c).toContain("stability");
    expect(c).toContain("state");
    expect(c).toContain("saveToFlashcard");
    expect(c).toContain("articleId");
    expect(c).toContain("storyId");
  });
});

describe("userSentenceRecords — RESHAPE (FSRS)", () => {
  it("has FSRS columns", () => {
    const c = cols(schema.userSentenceRecords);
    expect(c).toContain("sentence");
    expect(c).toContain("translation");
    expect(c).toContain("difficulty");
    expect(c).toContain("due");
    expect(c).toContain("lapses");
    expect(c).toContain("stability");
    expect(c).toContain("timepoint");
    expect(c).toContain("audioUrl");
  });
});

describe("aiInsights — RESHAPE (full Prisma schema)", () => {
  it("has rich Prisma columns", () => {
    const c = cols(schema.aiInsights);
    expect(c).toContain("type");
    expect(c).toContain("scope");
    expect(c).toContain("priority");
    expect(c).toContain("title");
    expect(c).toContain("description");
    expect(c).toContain("confidence");
    expect(c).toContain("dismissed");
    expect(c).toContain("validUntil");
    expect(c).not.toContain("content");
  });
});

describe("learningGoals — RESHAPE", () => {
  it("has Prisma enum fields", () => {
    const c = cols(schema.learningGoals);
    expect(c).toContain("goalType");
    expect(c).toContain("status");
    expect(c).toContain("priority");
    expect(c).toContain("isRecurring");
    expect(c).toContain("targetDate");
    expect(c).toContain("startDate");
  });
});

describe("gameRankings — RESHAPE", () => {
  it("has Prisma columns", () => {
    const c = cols(schema.gameRankings);
    expect(c).toContain("difficulty");
    expect(c).toContain("totalXp");
    expect(c).not.toContain("score");
    expect(c).not.toContain("completedAt");
  });
});

// ─── Science-advantage: new tables ───────────────────────────────────────────

describe("gamificationProfiles — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.gamificationProfiles).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.gamificationProfiles);
    expect(c).toContain("userId");
    expect(c).toContain("xp");
    expect(c).toContain("level");
    expect(c).toContain("streak");
  });
});

describe("achievements — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.achievements).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.achievements);
    expect(c).toContain("userId");
    expect(c).toContain("badgeType");
    expect(c).toContain("unlockedAt");
  });
});

describe("scienceClasses — KEEP-SEPARATE", () => {
  it("is exported from schema", () => {
    expect(schema.scienceClasses).toBeDefined();
  });
  it("has science-specific columns", () => {
    const c = cols(schema.scienceClasses);
    expect(c).toContain("name");
    expect(c).toContain("gradeLevel");
    expect(c).toContain("standardsAlignment");
    expect(c).toContain("joinCode");
    expect(c).toContain("teacherId");
  });
});

describe("scienceStandards — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.scienceStandards).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.scienceStandards);
    expect(c).toContain("framework");
    expect(c).toContain("code");
    expect(c).toContain("description");
  });
});

describe("scienceStandardMastery — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.scienceStandardMastery).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.scienceStandardMastery);
    expect(c).toContain("studentId");
    expect(c).toContain("standardId");
    expect(c).toContain("masteryLevel");
  });
});

describe("scienceLessons — KEEP-SEPARATE", () => {
  it("is exported from schema", () => {
    expect(schema.scienceLessons).toBeDefined();
  });
  it("has science-specific columns", () => {
    const c = cols(schema.scienceLessons);
    expect(c).toContain("slug");
    expect(c).toContain("lessonType");
    expect(c).toContain("gradeLevel");
    expect(c).toContain("order");
    expect(c).toContain("structuredContent");
  });
});

describe("scienceCurriculumUnits — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.scienceCurriculumUnits).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.scienceCurriculumUnits);
    expect(c).toContain("classId");
    expect(c).toContain("framework");
    expect(c).toContain("gradeLevel");
    expect(c).toContain("order");
  });
});

describe("scienceQuizQuestions — KEEP-SEPARATE", () => {
  it("is exported from schema", () => {
    expect(schema.scienceQuizQuestions).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.scienceQuizQuestions);
    expect(c).toContain("lessonId");
    expect(c).toContain("type");
    expect(c).toContain("correctAnswer");
    expect(c).toContain("version");
  });
});

describe("scienceAttempts — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.scienceAttempts).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.scienceAttempts);
    expect(c).toContain("studentId");
    expect(c).toContain("lessonId");
    expect(c).toContain("score");
    expect(c).toContain("attemptNumber");
  });
});

describe("scienceQuestionResponses — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.scienceQuestionResponses).toBeDefined();
  });
});

describe("scienceLessonCompletions — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.scienceLessonCompletions).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.scienceLessonCompletions);
    expect(c).toContain("studentId");
    expect(c).toContain("lessonId");
    expect(c).toContain("status");
    expect(c).toContain("bestScore");
  });
});

describe("scienceMasteryRuns — PORT-AS-IS", () => {
  it("is exported from schema", () => {
    expect(schema.scienceMasteryRuns).toBeDefined();
  });
});

describe("scienceAssignments — KEEP-SEPARATE", () => {
  it("is exported from schema", () => {
    expect(schema.scienceAssignments).toBeDefined();
  });
  it("has expected columns", () => {
    const c = cols(schema.scienceAssignments);
    expect(c).toContain("classId");
    expect(c).toContain("lessonId");
    expect(c).toContain("assignedBy");
    expect(c).toContain("dueAt");
  });
});
