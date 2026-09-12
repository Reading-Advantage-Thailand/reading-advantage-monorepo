import { describe, expect, it } from "vitest";

import {
  challengeCompletionRunReferenceSchema,
  classChallengeDefinitionSchema,
  classChallengePublicSummarySchema,
  studentChallengeRunLaunchSchema,
} from "../challenges.js";

const challengeId = "10000000-0000-4000-8000-000000000001";
const classId = "20000000-0000-4000-8000-000000000002";
const summary = {
  id: challengeId,
  classId,
  title: "River flight",
  gameId: "dragon-flight",
  gameVersion: "1",
  contentMode: "vocabulary" as const,
  contentLocale: "th",
  contentItemCount: 1,
  seed: 42,
  difficulty: "medium" as const,
  modality: {
    modality: "reading" as const,
    promptLocale: "th-TH" as const,
    answerLocale: "en-US" as const,
    promptField: "translation" as const,
    answerField: "term" as const,
    scored: true as const,
  },
  startsAt: "2026-09-09T08:00:00.000Z",
  expiresAt: "2026-09-10T08:00:00.000Z",
  target: 20,
  contributionCount: 3,
};
const content = {
  mode: "vocabulary" as const,
  items: [{ term: "river", translation: "แม่น้ำ" }],
};
const definition = {
  id: challengeId,
  schoolId: "30000000-0000-4000-8000-000000000003",
  classId,
  createdByUserId: "teacher-1",
  title: summary.title,
  gameId: summary.gameId,
  gameVersion: summary.gameVersion,
  contentLocale: summary.contentLocale,
  content,
  seed: summary.seed,
  difficulty: summary.difficulty,
  modality: summary.modality,
  startsAt: summary.startsAt,
  expiresAt: summary.expiresAt,
  target: summary.target,
  teacherParticipationEnabled: false,
};

describe("class challenge contracts", () => {
  it("keeps hidden learning content out of the public summary", () => {
    expect(classChallengePublicSummarySchema.parse(summary)).toEqual(summary);
    expect(classChallengePublicSummarySchema.safeParse({
      ...summary,
      content,
    }).success).toBe(false);
  });

  it("accepts a bounded server definition with exact content", () => {
    expect(classChallengeDefinitionSchema.safeParse(definition).success).toBe(true);
  });

  it("rejects an empty or blank server content snapshot", () => {
    expect(classChallengeDefinitionSchema.safeParse({
      ...definition,
      content: { mode: "vocabulary", items: [] },
    }).success).toBe(false);
    expect(classChallengeDefinitionSchema.safeParse({
      ...definition,
      content: { mode: "vocabulary", items: [{ term: " ", translation: "\t" }] },
    }).success).toBe(false);
  });

  it("rejects an unscored or reverse-direction modality", () => {
    expect(classChallengeDefinitionSchema.safeParse({
      ...definition,
      modality: { ...summary.modality, scored: false },
    }).success).toBe(false);
    expect(classChallengeDefinitionSchema.safeParse({
      ...definition,
      modality: {
        ...summary.modality,
        promptLocale: "en-US",
        answerLocale: "th-TH",
      },
    }).success).toBe(false);
  });

  it.each([
    ["reversed dates", { startsAt: summary.expiresAt, expiresAt: summary.startsAt }],
    ["unsafe seed", { seed: Number.MAX_SAFE_INTEGER + 1 }],
    ["empty content", { contentItemCount: 0 }],
  ])("rejects %s", (_label, patch) => {
    expect(classChallengePublicSummarySchema.safeParse({ ...summary, ...patch }).success).toBe(false);
  });

  it("rejects a mismatched or overlong student launch", () => {
    const launch = {
      runId: "40000000-0000-4000-8000-000000000004",
      challengeId,
      userId: "student-1",
      challenge: summary,
      content,
      issuedAt: "2026-09-09T09:00:00.000Z",
      expiresAt: "2026-09-10T09:00:00.000Z",
    };
    expect(studentChallengeRunLaunchSchema.safeParse(launch).success).toBe(false);
    expect(studentChallengeRunLaunchSchema.safeParse({
      ...launch,
      expiresAt: summary.expiresAt,
      content: { ...content, mode: "sentence" },
    }).success).toBe(false);
    expect(studentChallengeRunLaunchSchema.safeParse({
      ...launch,
      expiresAt: summary.expiresAt,
      issuedAt: "not-a-timestamp",
    }).success).toBe(false);
    expect(studentChallengeRunLaunchSchema.safeParse({
      ...launch,
      expiresAt: summary.expiresAt,
      seed: 42,
    }).success).toBe(false);
  });

  it("accepts a matching student launch within the challenge window", () => {
    expect(studentChallengeRunLaunchSchema.safeParse({
      runId: "40000000-0000-4000-8000-000000000004",
      challengeId,
      userId: "student-1",
      challenge: summary,
      content,
      issuedAt: "2026-09-09T09:00:00.000Z",
      expiresAt: summary.expiresAt,
    }).success).toBe(true);
  });

  it("accepts only an opaque run identifier at completion", () => {
    const reference = { runId: "40000000-0000-4000-8000-000000000004" };
    expect(challengeCompletionRunReferenceSchema.parse(reference)).toEqual(reference);
    expect(challengeCompletionRunReferenceSchema.safeParse({
      ...reference,
      seed: 42,
      eligible: true,
    }).success).toBe(false);
  });
});
