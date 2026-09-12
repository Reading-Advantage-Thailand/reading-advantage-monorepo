import type {
  ListeningEvidence,
  ListeningSessionConfig,
  ReadToSelectAudioEvidence,
  ReadToSelectAudioSessionConfig,
} from "@reading-advantage/game-contracts";

/** Stable failures exposed by shared listening playback. */
export type ListeningAudioFailureCode =
  | "invalid-configuration"
  | "invalid-item-position"
  | "load-failed"
  | "decode-failed"
  | "playback-failed"
  | "cancelled"
  | "muted"
  | "destroyed"
  | "replay-limit"
  | "scored-fallback-forbidden";

/** Structured failure raised by the shared listening controller. */
export class ListeningAudioControllerError extends Error {
  /**
   * Creates a structured listening audio failure.
   * @param code Stable machine-readable failure code.
   * @param message Safe failure description.
   * @param cause Original adapter failure when available.
   */
  constructor(
    public readonly code: ListeningAudioFailureCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ListeningAudioControllerError";
  }
}

/** Browser-safe URL reference for one indexed listening prompt. */
export interface ListeningAudioClipReference {
  /** Zero-based educational item position. */
  readonly itemPosition: number;
  /** Browser-safe prompt audio URL. */
  readonly url: string;
  /** Declared audio media type. */
  readonly mediaType: `audio/${string}`;
}

/** Provider-neutral preparation port for one prompt clip. */
export interface AudioClipPreparationPort<PreparedClip> {
  /**
   * Prepares one clip for playback.
   * @param reference Indexed URL clip reference.
   * @param signal Cancellation signal for stale or stopped work.
   * @returns Prepared provider-owned clip state.
   */
  prepare(
    reference: ListeningAudioClipReference,
    signal: AbortSignal,
  ): Promise<PreparedClip>;
  /**
   * Releases one prepared clip.
   * @param clip Provider-owned clip state.
   * @returns Nothing.
   */
  release(clip: PreparedClip): void;
}

/** Provider-neutral playback port for one prepared prompt. */
export interface AudioClipPlaybackPort<PreparedClip> {
  /**
   * Plays one prepared clip until completion or cancellation.
   * @param clip Prepared provider-owned clip state.
   * @param signal Cancellation signal for playback.
   * @returns A promise that resolves after playback ends.
   */
  play(clip: PreparedClip, signal: AbortSignal): Promise<void>;
}

/** Existing host audio adapter used during speech playback. */
export interface AudioDuckingPort {
  /**
   * Lowers background audio for speech.
   * @returns A callback that restores the prior audio state.
   */
  duck(): () => void;
}

/** Shared listening controller lifecycle state. */
export type ListeningAudioStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "completed"
  | "failed"
  | "cancelled"
  | "destroyed";

/** Explicit failure information for the current prompt operation. */
export interface ListeningAudioFailure {
  /** Stable failure code. */
  readonly code: ListeningAudioFailureCode;
  /** Educational item position affected by the failure. */
  readonly itemPosition: number;
  /** Safe failure description. */
  readonly message: string;
}

/** Immutable listening playback state for shared UI. */
export interface ListeningAudioSnapshot {
  /** Current controller state. */
  readonly status: ListeningAudioStatus;
  /** Current educational item position. */
  readonly activeItemPosition?: number;
  /** Current explicit failure when present. */
  readonly failure?: ListeningAudioFailure;
  /** Whether the host currently blocks prompt audio. */
  readonly muted: boolean;
}

/** Configuration for one shared listening controller. */
export interface ListeningAudioControllerOptions<PreparedClip> {
  /** Validated listening session policy. */
  readonly session: ListeningSessionConfig;
  /** Complete indexed URL clip set for the session. */
  readonly clips: readonly ListeningAudioClipReference[];
  /** Number of following clips to prepare, from zero through three. */
  readonly preloadAhead: number;
  /** Maximum preparation time, from 100 through 30000 milliseconds. */
  readonly preparationTimeoutMs: number;
  /** Maximum playback time, from 100 through 120000 milliseconds. */
  readonly playbackTimeoutMs?: number;
  /** Injected clip preparation port. */
  readonly preparation: AudioClipPreparationPort<PreparedClip>;
  /** Injected prepared-clip playback port. */
  readonly playback: AudioClipPlaybackPort<PreparedClip>;
  /** Existing host audio adapter used for background ducking. */
  readonly ducking: AudioDuckingPort;
}

/** Provider-neutral controller for one listening session. */
export interface ListeningAudioController {
  /**
   * Prepares the active prompt and bounded lookahead.
   * @param itemPosition Active educational item position.
   * @returns The latest immutable controller state.
   */
  prepare(itemPosition: number): Promise<ListeningAudioSnapshot>;
  /**
   * Plays the active prompt as its required initial playback.
   * @param itemPosition Active educational item position.
   * @returns The latest immutable controller state.
   */
  play(itemPosition: number): Promise<ListeningAudioSnapshot>;
  /**
   * Replays the active prompt and records only successful completion.
   * @param itemPosition Active educational item position.
   * @returns The latest immutable controller state.
   */
  replay(itemPosition: number): Promise<ListeningAudioSnapshot>;
  /**
   * Records explicit transcript assistance for one item.
   * @param itemPosition Assisted educational item position.
   * @returns Nothing.
   */
  recordTranscriptAssistance(itemPosition: number): void;
  /**
   * Records an explicit unscored reading fallback.
   * @param itemPosition Fallback educational item position.
   * @returns Nothing.
   */
  recordReadingFallback(itemPosition: number): void;
  /**
   * Applies the host mute state and cancels active audio when muted.
   * @param muted Whether prompt audio must remain silent.
   * @returns Nothing.
   */
  setMuted(muted: boolean): void;
  /**
   * Cancels active work while preserving prepared clips and evidence.
   * @returns Nothing.
   */
  pause(): void;
  /**
   * Cancels work, releases clips, and resets session evidence.
   * @returns Nothing.
   */
  restart(): void;
  /**
   * Cancels work, releases clips, and prevents later actions.
   * @returns Nothing.
   */
  destroy(): void;
  /**
   * Returns the latest immutable controller state.
   * @returns The current playback state.
   */
  getSnapshot(): ListeningAudioSnapshot;
  /**
   * Returns strict host-readable learning evidence metadata.
   * @returns Validated learning evidence for completion metadata.
   */
  getEvidence(): ListeningEvidence;
}

/** Playback state for one question and answer clip pair. */
export interface AnswerChoicePlaybackSnapshot {
  /** Current Thai question position. */
  readonly questionPosition: number;
  /** English answer clip position. */
  readonly clipItemPosition: number;
  /** Latest playback lifecycle state for this pair. */
  readonly status: ListeningAudioStatus;
  /** Number of playback requests for this pair. */
  readonly playCount: number;
  /** Number of replay requests after the first request. */
  readonly replayCount: number;
  /** Whether a completed playback can be submitted. */
  readonly canConfirm: boolean;
  /** Whether the latest completed playback was submitted. */
  readonly submitted: boolean;
  /** Current failure when the latest request failed. */
  readonly failure?: Omit<ListeningAudioFailure, "itemPosition">;
}

/** Immutable state for Read to Select Audio UI. */
export interface AnswerChoiceAudioSnapshot {
  /** Current controller lifecycle state. */
  readonly status: ListeningAudioStatus;
  /** Current Thai question position. */
  readonly questionPosition?: number;
  /** Active English clip position. */
  readonly activeClipItemPosition?: number;
  /** Pair states for the current question. */
  readonly choices: readonly AnswerChoicePlaybackSnapshot[];
  /** Whether the host currently blocks answer audio. */
  readonly muted: boolean;
}

/** Submission recorded after one completed answer playback. */
export interface AnswerChoiceConfirmation {
  /** Current question position. */
  readonly questionPosition: number;
  /** Visible Thai prompt position. */
  readonly promptItemPosition: number;
  /** Submitted English clip position. */
  readonly clipItemPosition: number;
  /** Stable attempt position within this question. */
  readonly attemptIndex: number;
  /** Whether the submitted clip completes the question. */
  readonly completedQuestion: boolean;
}

/** Configuration for one Read to Select Audio controller. */
export interface AnswerChoiceAudioControllerOptions<PreparedClip> {
  /** Validated Read to Select Audio session policy. */
  readonly session: ReadToSelectAudioSessionConfig;
  /** Complete indexed English answer clip set. */
  readonly clips: readonly ListeningAudioClipReference[];
  /** Maximum preparation time in milliseconds. */
  readonly preparationTimeoutMs: number;
  /** Maximum playback time in milliseconds. */
  readonly playbackTimeoutMs?: number;
  /** Maximum replays for each question and clip pair. */
  readonly maxReplaysPerChoice?: number;
  /** Injected clip preparation port. */
  readonly preparation: AudioClipPreparationPort<PreparedClip>;
  /** Injected prepared-clip playback port. */
  readonly playback: AudioClipPlaybackPort<PreparedClip>;
  /** Existing host audio adapter used for background ducking. */
  readonly ducking: AudioDuckingPort;
}

/** Shared Read to Select Audio controller. */
export interface AnswerChoiceAudioController {
  /**
   * Selects the active Thai question and cancels stale playback.
   * @param questionPosition The active content position.
   * @param clipItemPositions The stable English choices for this question.
   * @returns The latest immutable controller state.
   */
  setQuestion(
    questionPosition: number,
    clipItemPositions?: readonly number[],
  ): AnswerChoiceAudioSnapshot;
  /**
   * Plays one English answer choice without submitting it.
   * @param questionPosition The active Thai question position.
   * @param clipItemPosition The English answer clip position.
   * @returns The state after playback completes or becomes stale.
   */
  playChoice(questionPosition: number, clipItemPosition: number): Promise<AnswerChoiceAudioSnapshot>;
  /**
   * Checks whether one completed pair can be submitted.
   * @param questionPosition The active Thai question position.
   * @param clipItemPosition The English answer clip position.
   * @returns Whether the latest completed playback is unsubmitted.
   */
  canConfirmChoice(questionPosition: number, clipItemPosition: number): boolean;
  /**
   * Records a deliberate submission after completed playback.
   * @param questionPosition The active Thai question position.
   * @param clipItemPosition The English answer clip position.
   * @returns The recorded submission identity and completion result.
   */
  confirmChoice(questionPosition: number, clipItemPosition: number): AnswerChoiceConfirmation;
  /**
   * Cancels active answer playback and records its cancelled result.
   * @returns Nothing.
   */
  cancel(): void;
  /**
   * Cancels active answer playback for a host pause.
   * @returns Nothing.
   */
  pause(): void;
  /**
   * Resets playback state and evidence for a replayed game.
   * @returns Nothing.
   */
  restart(): void;
  /**
   * Applies the host mute state and cancels active audio when muted.
   * @param muted Whether answer audio must remain silent.
   * @returns Nothing.
   */
  setMuted(muted: boolean): void;
  /**
   * Releases every owned clip and prevents later actions.
   * @returns Nothing.
   */
  destroy(): void;
  /**
   * Returns the latest immutable controller state.
   * @returns The current answer audio state.
   */
  getSnapshot(): AnswerChoiceAudioSnapshot;
  /**
   * Returns state for one question and clip pair.
   * @param questionPosition The active Thai question position.
   * @param clipItemPosition The English answer clip position.
   * @returns The current pair state.
   */
  getChoiceSnapshot(questionPosition: number, clipItemPosition: number): AnswerChoicePlaybackSnapshot;
  /**
   * Subscribes to playback state changes.
   * @param listener The observer called with immutable state.
   * @returns A callback that removes the observer.
   */
  subscribe(listener: (snapshot: AnswerChoiceAudioSnapshot) => void): () => void;
  /**
   * Returns validated Read to Select Audio evidence.
   * @returns The current session evidence.
   */
  getEvidence(): ReadToSelectAudioEvidence;
}
