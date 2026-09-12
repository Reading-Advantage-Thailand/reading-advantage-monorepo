import {
  MAX_LISTENING_SESSION_ITEMS,
  readToSelectAudioEvidenceSchema,
  readToSelectAudioSessionConfigSchema,
  type ReadToSelectAudioEvidence,
} from "@reading-advantage/game-contracts";

import {
  ListeningAudioControllerError,
  type AnswerChoiceAudioController,
  type AnswerChoiceAudioControllerOptions,
  type AnswerChoiceAudioSnapshot,
  type AnswerChoiceConfirmation,
  type AnswerChoicePlaybackSnapshot,
  type ListeningAudioClipReference,
  type ListeningAudioFailureCode,
  type ListeningAudioStatus,
} from "./contracts.js";

const MIN_TIMEOUT_MS = 100;
const MAX_PREPARATION_TIMEOUT_MS = 30_000;
const DEFAULT_PLAYBACK_TIMEOUT_MS = 30_000;
const MAX_PLAYBACK_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_REPLAYS_PER_CHOICE = 2;
const MAX_REPLAYS_PER_CHOICE = 5;
const MAX_CHOICES_PER_QUESTION = 8;

type PlaybackResult = "completed" | "failed" | "cancelled";

type MutableAttempt = {
  attemptIndex: number;
  clipItemPosition: number;
  playbackResult: PlaybackResult;
  submitted: boolean;
  completedQuestion: boolean;
};

type MutableQuestion = {
  questionPosition: number;
  promptItemPosition: number;
  selectionAttempts: MutableAttempt[];
};

type PairState = {
  status: ListeningAudioStatus;
  playCount: number;
  replayCount: number;
  submitted: boolean;
  failure?: { code: ListeningAudioFailureCode; message: string };
};

type ActivePlayback = {
  questionPosition: number;
  clipItemPosition: number;
  attemptIndex: number;
  abort: AbortController;
  generation: number;
};

const pairKey = (questionPosition: number, clipItemPosition: number): string =>
  `${questionPosition}:${clipItemPosition}`;

const controllerError = (
  error: unknown,
  code: ListeningAudioFailureCode,
  message: string,
): ListeningAudioControllerError => error instanceof ListeningAudioControllerError
  ? error
  : new ListeningAudioControllerError(code, message, error);

/**
 * Creates a shared controller for hidden English answer audio.
 * @param options Session, clips, playback ports, timeouts, and replay policy.
 * @returns A controller that requires completed playback before submission.
 * @throws When the session, clips, timeouts, or replay policy are invalid.
 */
export function createAnswerChoiceAudioController<PreparedClip>(
  options: AnswerChoiceAudioControllerOptions<PreparedClip>,
): AnswerChoiceAudioController {
  const session = readToSelectAudioSessionConfigSchema.parse(options.session);
  const playbackTimeoutMs = options.playbackTimeoutMs ?? DEFAULT_PLAYBACK_TIMEOUT_MS;
  const maxReplays = options.maxReplaysPerChoice ?? DEFAULT_MAX_REPLAYS_PER_CHOICE;
  if (!Number.isInteger(options.preparationTimeoutMs)
    || options.preparationTimeoutMs < MIN_TIMEOUT_MS
    || options.preparationTimeoutMs > MAX_PREPARATION_TIMEOUT_MS) {
    throw new ListeningAudioControllerError(
      "invalid-configuration",
      "Answer audio preparation timeout must be from 100 through 30000 milliseconds",
    );
  }
  if (!Number.isInteger(playbackTimeoutMs)
    || playbackTimeoutMs < MIN_TIMEOUT_MS
    || playbackTimeoutMs > MAX_PLAYBACK_TIMEOUT_MS) {
    throw new ListeningAudioControllerError(
      "invalid-configuration",
      "Answer audio playback timeout must be from 100 through 120000 milliseconds",
    );
  }
  if (!Number.isInteger(maxReplays) || maxReplays < 0 || maxReplays > MAX_REPLAYS_PER_CHOICE) {
    throw new ListeningAudioControllerError(
      "invalid-configuration",
      "Answer audio replay limit must be from zero through five",
    );
  }
  if (options.clips.length < 1 || options.clips.length > MAX_LISTENING_SESSION_ITEMS) {
    throw new ListeningAudioControllerError(
      "invalid-configuration",
      "Answer audio clips must contain from one through 50 items",
    );
  }

  const references = new Map<number, ListeningAudioClipReference>();
  for (const reference of options.clips) {
    if (!Number.isInteger(reference.itemPosition)
      || reference.itemPosition < 0
      || reference.itemPosition >= options.clips.length
      || references.has(reference.itemPosition)
      || !reference.url.trim()
      || !reference.mediaType.startsWith("audio/")) {
      throw new ListeningAudioControllerError(
        "invalid-configuration",
        "Answer audio clips must cover unique session item positions",
      );
    }
    references.set(reference.itemPosition, Object.freeze({ ...reference }));
  }
  if (references.size !== options.clips.length) {
    throw new ListeningAudioControllerError(
      "invalid-configuration",
      "Answer audio clips must cover every session item position",
    );
  }

  const prepared = new Map<number, PreparedClip>();
  const pairStates = new Map<string, PairState>();
  const questions = new Map<number, MutableQuestion>();
  const failures = new Map<string, "load-failed" | "decode-failed" | "playback-failed">();
  const listeners = new Set<(snapshot: AnswerChoiceAudioSnapshot) => void>();
  let activeQuestionPosition: number | undefined;
  let activePlayback: ActivePlayback | undefined;
  let restoreDucking: (() => void) | undefined;
  let generation = 0;
  let muted = false;
  let destroyed = false;
  let status: ListeningAudioStatus = "idle";

  const assertActive = (): void => {
    if (destroyed) throw new ListeningAudioControllerError("destroyed", "Answer audio is destroyed");
  };

  const referenceAt = (position: number): ListeningAudioClipReference => {
    assertActive();
    const reference = references.get(position);
    if (!reference) {
      throw new ListeningAudioControllerError(
        "invalid-item-position",
        "Answer audio position is outside this session",
      );
    }
    return reference;
  };

  const questionAt = (questionPosition: number): MutableQuestion => {
    referenceAt(questionPosition);
    let question = questions.get(questionPosition);
    if (!question) {
      question = { questionPosition, promptItemPosition: questionPosition, selectionAttempts: [] };
      questions.set(questionPosition, question);
    }
    return question;
  };

  const stateAt = (questionPosition: number, clipItemPosition: number): PairState => {
    const key = pairKey(questionPosition, clipItemPosition);
    let pair = pairStates.get(key);
    if (!pair) {
      pair = { status: "idle", playCount: 0, replayCount: 0, submitted: false };
      pairStates.set(key, pair);
    }
    return pair;
  };

  const canConfirm = (questionPosition: number, clipItemPosition: number): boolean => {
    if (destroyed || activeQuestionPosition !== questionPosition) return false;
    const pair = pairStates.get(pairKey(questionPosition, clipItemPosition));
    if (!pair || pair.status !== "completed" || pair.submitted) return false;
    const attempts = questions.get(questionPosition)?.selectionAttempts ?? [];
    const attempt = [...attempts].reverse().find((candidate) => (
      candidate.clipItemPosition === clipItemPosition
      && candidate.playbackResult === "completed"
    ));
    return attempt !== undefined && !attempt.submitted;
  };

  const choiceSnapshot = (
    questionPosition: number,
    clipItemPosition: number,
  ): AnswerChoicePlaybackSnapshot => {
    const pair = stateAt(questionPosition, clipItemPosition);
    return Object.freeze({
      questionPosition,
      clipItemPosition,
      status: pair.status,
      playCount: pair.playCount,
      replayCount: pair.replayCount,
      canConfirm: canConfirm(questionPosition, clipItemPosition),
      submitted: pair.submitted,
      ...(pair.failure ? { failure: Object.freeze({ ...pair.failure }) } : {}),
    });
  };

  const snapshot = (): AnswerChoiceAudioSnapshot => Object.freeze({
    status,
    ...(activeQuestionPosition === undefined ? {} : { questionPosition: activeQuestionPosition }),
    ...(activePlayback === undefined ? {} : { activeClipItemPosition: activePlayback.clipItemPosition }),
    choices: activeQuestionPosition === undefined
      ? Object.freeze([])
      : Object.freeze([...pairStates.keys()]
        .map((key) => key.split(":").map(Number))
        .filter(([question]) => question === activeQuestionPosition)
        .sort((left, right) => left[1]! - right[1]!)
        .map(([, clip]) => choiceSnapshot(activeQuestionPosition!, clip!))),
    muted,
  });

  const emit = (): AnswerChoiceAudioSnapshot => {
    const next = snapshot();
    for (const listener of listeners) {
      try {
        listener(next);
      } catch {
        // UI observers cannot interrupt playback or evidence updates.
      }
    }
    return next;
  };

  const restoreBackground = (): void => {
    const restore = restoreDucking;
    restoreDucking = undefined;
    restore?.();
  };

  const appendAttempt = (
    questionPosition: number,
    clipItemPosition: number,
    attemptIndex: number,
    playbackResult: PlaybackResult,
  ): MutableAttempt => {
    const attempt = {
      attemptIndex,
      clipItemPosition,
      playbackResult,
      submitted: false,
      completedQuestion: false,
    };
    questionAt(questionPosition).selectionAttempts.push(attempt);
    return attempt;
  };

  const cancelActive = (emitChange: boolean): void => {
    const active = activePlayback;
    if (!active) return;
    generation += 1;
    active.abort.abort();
    activePlayback = undefined;
    restoreBackground();
    appendAttempt(
      active.questionPosition,
      active.clipItemPosition,
      active.attemptIndex,
      "cancelled",
    );
    const pair = stateAt(active.questionPosition, active.clipItemPosition);
    pair.status = "cancelled";
    pair.submitted = false;
    delete pair.failure;
    status = "cancelled";
    if (emitChange) emit();
  };

  const withTimeout = async <Value>(
    operation: Promise<Value>,
    abort: AbortController,
    timeoutMs: number,
    failureCode: "load-failed" | "playback-failed",
    message: string,
  ): Promise<Value> => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => {
            timedOut = true;
            abort.abort();
            reject(new ListeningAudioControllerError(failureCode, message));
          }, timeoutMs);
        }),
      ]);
    } catch (error) {
      if (timedOut) throw new ListeningAudioControllerError(failureCode, message, error);
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  };

  const prepare = async (
    reference: ListeningAudioClipReference,
    abort: AbortController,
  ): Promise<PreparedClip> => {
    const existing = prepared.get(reference.itemPosition);
    if (existing) return existing;
    const preparation = options.preparation.prepare(reference, abort.signal).then((clip) => {
      if (!abort.signal.aborted) return clip;
      options.preparation.release(clip);
      throw new ListeningAudioControllerError("cancelled", "Answer audio preparation was cancelled");
    });
    const clip = await withTimeout(
      preparation,
      abort,
      options.preparationTimeoutMs,
      "load-failed",
      "Answer audio preparation timed out",
    );
    if (abort.signal.aborted) {
      options.preparation.release(clip);
      throw new ListeningAudioControllerError("cancelled", "Answer audio preparation was cancelled");
    }
    prepared.set(reference.itemPosition, clip);
    return clip;
  };

  const setQuestion = (
    questionPosition: number,
    clipItemPositions: readonly number[] = [],
  ): AnswerChoiceAudioSnapshot => {
    referenceAt(questionPosition);
    if (clipItemPositions.length > MAX_CHOICES_PER_QUESTION
      || new Set(clipItemPositions).size !== clipItemPositions.length) {
      throw new ListeningAudioControllerError(
        "invalid-configuration",
        "Answer audio choices must contain at most eight unique positions",
      );
    }
    for (const clipItemPosition of clipItemPositions) referenceAt(clipItemPosition);
    if (activeQuestionPosition !== questionPosition) {
      cancelActive(false);
      activeQuestionPosition = questionPosition;
      status = "idle";
    }
    questionAt(questionPosition);
    for (const clipItemPosition of clipItemPositions) stateAt(questionPosition, clipItemPosition);
    return emit();
  };

  const playChoice = async (
    questionPosition: number,
    clipItemPosition: number,
  ): Promise<AnswerChoiceAudioSnapshot> => {
    const reference = referenceAt(clipItemPosition);
    setQuestion(questionPosition);
    if (muted) throw new ListeningAudioControllerError("muted", "Answer audio is muted");
    if (questionAt(questionPosition).selectionAttempts.some((attempt) => attempt.completedQuestion)) {
      throw new ListeningAudioControllerError(
        "invalid-configuration",
        "A completed answer audio question cannot accept another attempt",
      );
    }
    const pair = stateAt(questionPosition, clipItemPosition);
    if (pair.replayCount >= maxReplays && pair.playCount > 0) {
      throw new ListeningAudioControllerError("replay-limit", "Answer audio replay limit was reached");
    }
    cancelActive(false);
    const question = questionAt(questionPosition);
    const attemptIndex = question.selectionAttempts.length;
    const abort = new AbortController();
    const operationGeneration = ++generation;
    activePlayback = { questionPosition, clipItemPosition, attemptIndex, abort, generation: operationGeneration };
    pair.replayCount += pair.playCount > 0 ? 1 : 0;
    pair.playCount += 1;
    pair.status = prepared.has(clipItemPosition) ? "ready" : "loading";
    pair.submitted = false;
    delete pair.failure;
    status = pair.status;
    emit();
    try {
      const clip = await prepare(reference, abort);
      if (destroyed || operationGeneration !== generation || abort.signal.aborted) return snapshot();
      pair.status = "ready";
      status = "ready";
      emit();
      pair.status = "playing";
      status = "playing";
      emit();
      restoreDucking = options.ducking.duck();
      await withTimeout(
        options.playback.play(clip, abort.signal),
        abort,
        playbackTimeoutMs,
        "playback-failed",
        "Answer audio playback timed out",
      );
      if (destroyed || operationGeneration !== generation || abort.signal.aborted) return snapshot();
      activePlayback = undefined;
      restoreBackground();
      appendAttempt(questionPosition, clipItemPosition, attemptIndex, "completed");
      pair.status = "completed";
      status = "completed";
      return emit();
    } catch (error) {
      restoreBackground();
      if (destroyed || operationGeneration !== generation || abort.signal.aborted) return snapshot();
      activePlayback = undefined;
      const failure = controllerError(error, "playback-failed", "Answer audio playback failed");
      const failureCode = failure.code === "load-failed" || failure.code === "decode-failed"
        ? failure.code
        : "playback-failed";
      failures.set(pairKey(questionPosition, clipItemPosition), failureCode);
      appendAttempt(questionPosition, clipItemPosition, attemptIndex, "failed");
      pair.status = "failed";
      pair.failure = { code: failureCode, message: failure.message };
      status = "failed";
      emit();
      throw failure;
    }
  };

  return Object.freeze({
    setQuestion,
    playChoice,
    canConfirmChoice(questionPosition: number, clipItemPosition: number): boolean {
      referenceAt(questionPosition);
      referenceAt(clipItemPosition);
      return canConfirm(questionPosition, clipItemPosition);
    },
    confirmChoice(questionPosition: number, clipItemPosition: number): AnswerChoiceConfirmation {
      referenceAt(questionPosition);
      referenceAt(clipItemPosition);
      if (!canConfirm(questionPosition, clipItemPosition)) {
        throw new ListeningAudioControllerError(
          "invalid-configuration",
          "Answer choice requires completed unsubmitted playback",
        );
      }
      const attempts = questionAt(questionPosition).selectionAttempts;
      const attempt = [...attempts].reverse().find((candidate) => (
        candidate.clipItemPosition === clipItemPosition
        && candidate.playbackResult === "completed"
        && !candidate.submitted
      ));
      if (!attempt) throw new ListeningAudioControllerError("invalid-configuration", "Answer attempt is unavailable");
      attempt.submitted = true;
      attempt.completedQuestion = clipItemPosition === questionPosition;
      const pair = stateAt(questionPosition, clipItemPosition);
      pair.submitted = true;
      emit();
      return Object.freeze({
        questionPosition,
        promptItemPosition: questionPosition,
        clipItemPosition,
        attemptIndex: attempt.attemptIndex,
        completedQuestion: attempt.completedQuestion,
      });
    },
    cancel(): void {
      assertActive();
      cancelActive(true);
    },
    pause(): void {
      assertActive();
      cancelActive(true);
    },
    restart(): void {
      assertActive();
      cancelActive(false);
      for (const clip of prepared.values()) options.preparation.release(clip);
      prepared.clear();
      pairStates.clear();
      questions.clear();
      failures.clear();
      activeQuestionPosition = undefined;
      status = "idle";
      emit();
    },
    setMuted(nextMuted: boolean): void {
      assertActive();
      muted = nextMuted;
      if (muted) cancelActive(false);
      emit();
    },
    destroy(): void {
      if (destroyed) return;
      cancelActive(false);
      for (const clip of prepared.values()) options.preparation.release(clip);
      prepared.clear();
      destroyed = true;
      status = "destroyed";
      emit();
      listeners.clear();
    },
    getSnapshot: snapshot,
    getChoiceSnapshot(questionPosition: number, clipItemPosition: number): AnswerChoicePlaybackSnapshot {
      referenceAt(questionPosition);
      referenceAt(clipItemPosition);
      return choiceSnapshot(questionPosition, clipItemPosition);
    },
    subscribe(listener: (next: AnswerChoiceAudioSnapshot) => void): () => void {
      assertActive();
      listeners.add(listener);
      try {
        listener(snapshot());
      } catch {
        // UI observers cannot interrupt controller ownership.
      }
      return () => listeners.delete(listener);
    },
    getEvidence(): ReadToSelectAudioEvidence {
      assertActive();
      const evidence = {
        schemaVersion: 1 as const,
        declaredModality: "read-to-select-audio" as const,
        effectiveModality: "read-to-select-audio" as const,
        promptLocale: session.promptLocale,
        answerLocale: session.answerLocale,
        promptField: session.promptField,
        answerField: session.answerField,
        itemCount: references.size,
        questions: [...questions.values()]
          .filter((question) => question.selectionAttempts.length > 0)
          .sort((left, right) => left.questionPosition - right.questionPosition)
          .map((question) => ({
            questionPosition: question.questionPosition,
            promptItemPosition: question.promptItemPosition,
            selectionAttempts: question.selectionAttempts.map((attempt) => ({ ...attempt })),
          })),
        replayCounts: [...pairStates.entries()]
          .filter(([, pair]) => pair.replayCount > 0)
          .map(([key, pair]) => {
            const [questionPosition, clipItemPosition] = key.split(":").map(Number) as [number, number];
            return { questionPosition, clipItemPosition, count: pair.replayCount };
          })
          .sort((left, right) => left.questionPosition - right.questionPosition
            || left.clipItemPosition - right.clipItemPosition),
        audioFailures: [...failures.entries()]
          .map(([key, code]) => {
            const [questionPosition, clipItemPosition] = key.split(":").map(Number) as [number, number];
            return { questionPosition, clipItemPosition, code };
          })
          .sort((left, right) => left.questionPosition - right.questionPosition
            || left.clipItemPosition - right.clipItemPosition),
      };
      return readToSelectAudioEvidenceSchema.parse(evidence);
    },
  });
}
