import type { PlayableGame } from "@/lib/games/catalog";
import { storyCompletionInput } from "@/lib/story-games/completion";
import {
  mapGameResultsToCompletionInput,
  type GameCompletionInput,
  type GameResults,
  type ReadToSelectAudioEvidence,
  type StoryGameEvidence,
  type StudentChallengeRunLaunch,
} from "@reading-advantage/game-contracts";

/** One run's timing and outcome, from the host. */
export interface RunContext {
  startedAt: number;
  now: number;
  victory: boolean;
  idempotencyKey: string;
}

/** The completion the host posts: the catalog input, plus the run id of a class challenge. */
export type HostCompletion = GameCompletionInput & { readonly challengeRunId?: string };

/**
 * Checks that a class challenge launch can run on this game: the challenge names this game (or its
 * legacy id), the installed capability has the challenge's content mode (the APK input the game
 * receives), version, and the reading
 * modality, and the difficulty is the one medium level the 3D games play.
 * @param game The game about to run.
 * @param launch The server-issued run.
 * @param resolve Maps a challenge game id to the installed game id (legacy ids included).
 * @returns True when the run can start.
 */
export function canRunChallenge(game: PlayableGame, launch: StudentChallengeRunLaunch, resolve: (id: string) => string | undefined): boolean {
  const capability = game.manifest.challenge;
  const c = launch.challenge;
  return Boolean(capability)
    && resolve(c.gameId) === game.id
    && c.contentMode === capability!.inputMode
    && c.gameVersion === capability!.version
    && c.modality.modality === "reading"
    && capability!.modalities.includes("reading")
    && c.difficulty === "medium";
}

/**
 * Maps a finished run to the completion input of `/api/v1/apk/complete`. A practice run is a story
 * game completion (gameType `<id>-story`, the story evidence as learning evidence). A class challenge
 * run keeps the challenge's own game id, difficulty, and modality, so the contribution rules match it;
 * its story evidence rides under `storyEvidence`, because a reading challenge carries no learning evidence.
 * An English answer audio run is a catalog completion on the student's flashcards (gameType `<id>`),
 * with the answer evidence as learning evidence and the story evidence under `storyEvidence`.
 * @param game The game that ran.
 * @param launch The challenge run, or null for a practice run.
 * @param result The five-field game result.
 * @param evidence The per-item story evidence.
 * @param run The run's timing and outcome.
 * @param answerEvidence The answer audio controller's evidence of an English answer audio run.
 * @returns The completion body.
 */
export function hostCompletionInput(
  game: PlayableGame,
  launch: StudentChallengeRunLaunch | null,
  result: GameResults,
  evidence: StoryGameEvidence,
  run: RunContext,
  answerEvidence?: ReadToSelectAudioEvidence,
): HostCompletion {
  const duration = Math.max(0, Math.round((run.now - run.startedAt) / 1000));
  if (!launch && answerEvidence) {
    return mapGameResultsToCompletionInput(result, {
      gameType: game.id,
      difficulty: "medium",
      duration,
      victory: run.victory,
      idempotencyKey: run.idempotencyKey,
      clientTimestamp: run.now,
      metadata: { contentSource: "student-flashcards", inputMode: "vocabulary", host: "primary-advantage", learningEvidence: answerEvidence, storyEvidence: evidence },
    });
  }
  if (!launch) return storyCompletionInput(game.id, result, evidence, { ...run, helper: false });
  const c = launch.challenge;
  return {
    ...mapGameResultsToCompletionInput(result, {
      gameType: c.gameId,
      difficulty: c.difficulty,
      duration,
      victory: run.victory,
      idempotencyKey: run.idempotencyKey,
      clientTimestamp: run.now,
      metadata: { contentSource: "class-challenge", inputMode: c.contentMode, host: "primary-advantage", challengeModality: c.modality, storyEvidence: evidence },
    }),
    challengeRunId: launch.runId,
  };
}
