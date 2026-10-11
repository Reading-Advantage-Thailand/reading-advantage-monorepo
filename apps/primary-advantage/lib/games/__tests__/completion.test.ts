import { describe, expect, it } from "vitest";
import type { ReadToSelectAudioEvidence, StudentChallengeRunLaunch } from "@reading-advantage/game-contracts";

import { gameFor } from "../catalog";
import { canRunChallenge, hostCompletionInput } from "../completion";

const game = gameFor("hero-vs-zombie")!;
const resolve = (id: string) => gameFor(id)?.id;
const result = { accuracy: 0.8, xp: 40, score: 800, correctAnswers: 8, totalAttempts: 10 };
const evidence = { schemaVersion: 1 as const, kind: "story-game" as const, gameId: "hero-vs-zombie", inputId: "vocabulary", level: "A1" as const, seed: 29, durationMs: 60_000, items: [], practice: [] };
const run = { startedAt: 1_000, now: 61_500, victory: true, idempotencyKey: "11111111-1111-4111-8111-111111111111" };
const modality = { modality: "reading" as const, promptLocale: "th-TH" as const, answerLocale: "en-US" as const, promptField: "translation" as const, answerField: "term" as const, scored: true as const };
const launch = {
  runId: "22222222-2222-4222-8222-222222222222",
  challengeId: "33333333-3333-4333-8333-333333333333",
  userId: "student-7",
  challenge: {
    id: "33333333-3333-4333-8333-333333333333", classId: "44444444-4444-4444-8444-444444444444", title: "Week 3", gameId: "wizard-vs-zombie", gameVersion: "2026-10-06.1",
    contentMode: "vocabulary", contentLocale: "th", contentItemCount: 2, seed: 29, difficulty: "medium", modality,
    startsAt: "2026-10-06T00:00:00.000Z", expiresAt: "2026-10-13T00:00:00.000Z", target: 100, contributionCount: 0,
  },
  content: { mode: "vocabulary", items: [{ term: "apple", translation: "แอปเปิล" }, { term: "river", translation: "แม่น้ำ" }] },
  issuedAt: "2026-10-06T10:00:00.000Z",
  expiresAt: "2026-10-06T11:00:00.000Z",
} as unknown as StudentChallengeRunLaunch;

describe("canRunChallenge", () => {
  it("accepts a reading challenge on the game's legacy id at the installed version", () => {
    expect(canRunChallenge(game, launch, resolve)).toBe(true);
  });

  it.each([
    ["another game", { gameId: "dragon-flight" }],
    ["an older game version", { gameVersion: "2026-09-09.1" }],
    ["a sentence challenge", { contentMode: "sentence" }],
    ["a hard challenge", { difficulty: "hard" }],
    ["an answer-audio challenge", { modality: { ...modality, modality: "read-to-select-audio" } }],
  ])("rejects %s", (_label, change) => {
    const other = { ...launch, challenge: { ...launch.challenge, ...change } } as StudentChallengeRunLaunch;
    expect(canRunChallenge(game, other, resolve)).toBe(false);
  });

  it("rejects a game without a challenge capability", () => {
    expect(canRunChallenge(gameFor("rune-match")!, launch, resolve)).toBe(false);
  });
});

describe("hostCompletionInput", () => {
  it("posts a practice run as a story game completion with the story evidence", () => {
    const body = hostCompletionInput(game, null, result, evidence, run);
    expect(body.gameType).toBe("hero-vs-zombie-story");
    expect(body.difficulty).toBe("medium");
    expect(body.duration).toBe(61);
    expect(body.metadata?.learningEvidence).toEqual(evidence);
    expect(body.challengeRunId).toBeUndefined();
  });

  it("posts a challenge run under the challenge's own game id, with the run id and no learning evidence", () => {
    const body = hostCompletionInput(game, launch, result, evidence, run);
    expect(body.gameType).toBe("wizard-vs-zombie");
    expect(body.challengeRunId).toBe(launch.runId);
    expect(body.correctAnswers).toBe(8);
    expect(body.victory).toBe(true);
    expect(body.metadata).toMatchObject({ contentSource: "class-challenge", inputMode: "vocabulary", host: "primary-advantage", challengeModality: modality, storyEvidence: evidence });
    expect(body.metadata?.learningEvidence).toBeUndefined();
  });

  it("posts an English answer audio run under the game id, with the answer evidence as learning evidence", () => {
    // Two questions, one wrong choice first: 3 submitted choices, 2 correct.
    const answerEvidence = {
      schemaVersion: 1, declaredModality: "read-to-select-audio", effectiveModality: "read-to-select-audio",
      promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", itemCount: 2,
      questions: [
        { questionPosition: 0, promptItemPosition: 0, selectionAttempts: [
          { attemptIndex: 0, clipItemPosition: 1, playbackResult: "completed", submitted: true, completedQuestion: false },
          { attemptIndex: 1, clipItemPosition: 0, playbackResult: "completed", submitted: true, completedQuestion: true },
        ] },
        { questionPosition: 1, promptItemPosition: 1, selectionAttempts: [
          { attemptIndex: 0, clipItemPosition: 1, playbackResult: "completed", submitted: true, completedQuestion: true },
        ] },
      ],
      replayCounts: [], audioFailures: [],
    } as ReadToSelectAudioEvidence;
    const body = hostCompletionInput(game, null, { ...result, correctAnswers: 2, totalAttempts: 3 }, evidence, run, answerEvidence);
    expect(body.gameType).toBe("hero-vs-zombie");
    expect(body.difficulty).toBe("medium");
    expect(body.duration).toBe(61);
    expect(body.metadata).toEqual({ contentSource: "student-flashcards", inputMode: "vocabulary", host: "primary-advantage", learningEvidence: answerEvidence, storyEvidence: evidence });
    expect(body.challengeRunId).toBeUndefined();
  });
});
