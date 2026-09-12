"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  sentenceInputSchema,
  vocabularyInputSchema,
  type GameResults,
  type LearningEvidence,
} from "@reading-advantage/game-contracts";

import {
  gameBriefingSchema,
  gameLifecycleTransitionSchema,
  resolveGameBriefingStartPhase,
  type GameBriefing,
  type GameLifecycleTransition,
} from "../presentation/game-briefing-contract.js";
import { GameBriefingScreen } from "../presentation/game-briefing-screen.js";
import { createGameTutorialController } from "../presentation/game-tutorial-controller.js";
import { GameTutorialScreen } from "../presentation/game-tutorial-screen.js";
import {
  GameResultPanel,
  type GamePersistenceState,
} from "../presentation/game-presentation.js";
import {
  STANDARD_GAME_REQUIRED_CREDIT,
  type StandardGameDebrief,
  type StandardGameExperienceRuntime,
} from "../presentation/standard-game-experience.js";
import type { GameTutorialClock, GameTutorialEffects } from "../presentation/game-tutorial-runtime.js";
import type {
  GameTutorialActionDriver,
  GameTutorialDefinition,
} from "../presentation/game-tutorial-contract.js";
import type { GameTutorialController, GameTutorialControllerSnapshot } from "../presentation/game-tutorial-controller.js";
import type {
  LayoutProfile,
  ResponsiveInputMode,
} from "../responsive/responsive-composition.js";
import { createPhaserGameFactory } from "../runtime/phaser-factory.js";
import { mountCartridge } from "../runtime/runtime.js";
import type {
  APKDiagnosticEvent,
  APKGameHandle,
  GameFactory,
  GameTerminalOutcome,
  ResponsiveRuntimeOptions,
  RuntimeCartridge,
  RuntimeEdition,
} from "../runtime/types.js";
import type { AnswerChoiceAudioController, ListeningAudioController } from "../audio/index.js";

/** Props for the accessible React host surrounding one Phaser cartridge. */
export type APKGameHostProps = Omit<ComponentProps<"section">, "onComplete" | "inputMode"> & {
  /** Cartridge definition to mount. */
  cartridge: RuntimeCartridge;
  /** Strict vocabulary or sentence array. */
  input: unknown;
  /** Host-selected audience edition. */
  edition: RuntimeEdition;
  /** Optional injected factory, primarily for tests. */
  factory?: GameFactory;
  /** Optional deterministic session seed. */
  seed?: number;
  /** Optional responsive runtime policy for the canvas mount surface. */
  responsive?: ResponsiveRuntimeOptions;
  /** Optional validated mission briefing shown before normal gameplay. */
  briefing?: GameBriefing;
  /** Optional validated tutorial that runs through the cartridge mechanic. */
  tutorial?: GameTutorialDefinition;
  /** Complete cartridge-owned briefing, guided tutorial, and debrief runtime. */
  standardExperience?: StandardGameExperienceRuntime;
  /** Cartridge-owned driver for the tutorial mechanic. */
  tutorialActionDriver?: GameTutorialActionDriver & { readonly destroy?: () => void | Promise<void> };
  /** Optional deterministic clock for tutorial playback. */
  tutorialClock?: GameTutorialClock;
  /** Receives host-neutral tutorial snapshots. */
  onTutorialSnapshot?: (snapshot: GameTutorialControllerSnapshot) => void;
  /** Optional spatial profile used by the mission briefing presentation. */
  layoutProfile?: LayoutProfile;
  /** Optional input capability mode used to filter briefing control hints. */
  inputMode?: ResponsiveInputMode;
  /** One bounded host-owned extension rendered in the briefing footer. */
  briefingExtension?: ReactNode;
  /** Host-owned rewards shown only after the completed result is saved. */
  resultExtension?: ReactNode;
  /** Accessible instructions displayed outside the canvas. */
  instructions?: ReactNode;
  /** Receives the validated result and returns an optional authoritative confirmation. */
  onComplete?: (
    result: GameResults,
    outcome: GameTerminalOutcome,
    evidence?: LearningEvidence,
  ) => void | APKHostCompletionConfirmation | Promise<void | APKHostCompletionConfirmation>;
  /** Maximum time to wait for host persistence before offering recovery actions. */
  persistenceTimeoutMs?: number;
  /** Creates one listening controller for each authoritative playing mount. */
  createListeningSession?: () => ListeningAudioController;
  /** Creates one answer audio controller for each authoritative playing mount. */
  createAnswerAudioSession?: () => AnswerChoiceAudioController;
  /** Receives changes to the host mute state for external audio. */
  onMutedChange?: (muted: boolean) => void;
  /** Receives one validated transition emitted by the standard lifecycle host. */
  onLifecycleTransition?: (transition: GameLifecycleTransition) => void;
  /** Receives structured runtime and cartridge diagnostics. */
  onDiagnostic?: (event: APKDiagnosticEvent) => void;
  /** Receives host-relative navigation requests. */
  onNavigate?: (destination: string) => void;
  /** Optional first phase. Use `demo` to open a scored-session-free class demonstration. */
  launchPhase?: "briefing" | "demo";
};

/** Host-owned confirmation returned after authoritative completion persistence. */
export interface APKHostCompletionConfirmation {
  /** Server-confirmed XP grant. */
  readonly xpEarned: number;
  /** Whether the server recognized a repeated idempotent submission. */
  readonly duplicate: boolean;
}

const DEFAULT_DEBRIEF: StandardGameDebrief = Object.freeze({
  outcome: "complete",
  requiredCredit: STANDARD_GAME_REQUIRED_CREDIT,
  replayEntry: "briefing",
  exitDestination: "catalog",
});

const DEFAULT_DEMO_SEED = 1;
const DEFAULT_PERSISTENCE_TIMEOUT_MS = 10_000;
type ProvisionalCompletion = {
  generation: number;
  result: GameResults;
  outcome: GameTerminalOutcome;
  evidence?: LearningEvidence;
};

type TutorialSession = {
  token: object;
  controller: GameTutorialController;
  tutorial: GameTutorialDefinition;
  standardExperience: StandardGameExperienceRuntime | undefined;
  tutorialActionDriver: GameTutorialActionDriver | undefined;
  tutorialClock: GameTutorialClock | undefined;
};

type TutorialCommandGate = {
  controller: GameTutorialController;
  token: object;
  promise: Promise<void>;
};

type PendingHostCleanup = {
  mountPoint: HTMLDivElement | undefined;
  controller?: GameTutorialController;
  driver?: GameTutorialActionDriver & { readonly destroy?: () => void | Promise<void> };
  handle?: APKGameHandle;
};

/**
 * Creates the real-time browser clock used by guided tutorials.
 * @returns A cancellable clock backed by the current browser window.
 */
function createBrowserTutorialClock(): GameTutorialClock {
  return {
    now: () => performance.now(),
    setTimeout: (callback, delayMs) => window.setTimeout(() => {
      void callback();
    }, delayMs),
    clearTimeout: (handle) => window.clearTimeout(handle),
  };
}

/**
 * Hosts a client-only cartridge with accessible controls, status, errors, and results.
 * @param props Cartridge launch options plus native section attributes.
 * @returns An accessible DOM shell and isolated Phaser mount surface.
 */
export function APKGameHost({
  cartridge,
  input,
  edition,
  factory,
  seed,
  responsive,
  briefing,
  tutorial,
  standardExperience,
  tutorialActionDriver,
  tutorialClock,
  onTutorialSnapshot,
  layoutProfile,
  inputMode,
  briefingExtension,
  resultExtension,
  instructions,
  onComplete,
  persistenceTimeoutMs = DEFAULT_PERSISTENCE_TIMEOUT_MS,
  createListeningSession,
  createAnswerAudioSession,
  onMutedChange,
  onLifecycleTransition,
  onDiagnostic,
  onNavigate,
  launchPhase = "briefing",
  "aria-label": ariaLabel = "Language game",
  tabIndex = -1,
  children,
  style: hostStyle,
  ...sectionProps
}: APKGameHostProps): import("react").ReactElement {
  const effectiveBriefing = standardExperience?.definition.briefing ?? briefing;
  const effectiveTutorial = standardExperience?.definition.tutorial ?? tutorial;
  const effectiveDebrief = standardExperience?.definition.debrief ?? DEFAULT_DEBRIEF;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<APKGameHandle | undefined>(undefined);
  const tutorialControllerRef = useRef<GameTutorialController | undefined>(undefined);
  const mountPointRef = useRef<HTMLDivElement | undefined>(undefined);
  const mountGenerationRef = useRef(0);
  const playingGenerationRef = useRef<number | undefined>(undefined);
  const resumingGenerationRef = useRef<number | undefined>(undefined);
  const provisionalPlayingGenerationRef = useRef<number | undefined>(undefined);
  const provisionalCompletionRef = useRef<ProvisionalCompletion | undefined>(undefined);
  const completionAuthorityRef = useRef(0);
  const persistencePendingAuthorityRef = useRef<number | undefined>(undefined);
  const tutorialSessionRef = useRef<TutorialSession | undefined>(undefined);
  const tutorialTransitionTokenRef = useRef<object | undefined>(undefined);
  const tutorialCommandQueueRef = useRef<Promise<void>>(Promise.resolve());
  const tutorialCommandPendingRef = useRef(false);
  const tutorialCommandGateRef = useRef<TutorialCommandGate | undefined>(undefined);
  const pendingCleanupRef = useRef<PendingHostCleanup | undefined>(undefined);
  const cleanupAttemptRef = useRef<Promise<void> | undefined>(undefined);
  const mountQueueRef = useRef<Promise<void>>(Promise.resolve());
  const briefingStartGuardRef = useRef(false);
  const demoTeardownRef = useRef(false);
  const lifecycleErrorRef = useRef<string | undefined>(undefined);
  const onCompleteRef = useRef(onComplete);
  const onLifecycleTransitionRef = useRef(onLifecycleTransition);
  const onDiagnosticRef = useRef(onDiagnostic);
  const onNavigateRef = useRef(onNavigate);
  const onMutedChangeRef = useRef(onMutedChange);
  const onTutorialSnapshotRef = useRef(onTutorialSnapshot);
  onCompleteRef.current = onComplete;
  onLifecycleTransitionRef.current = onLifecycleTransition;
  onDiagnosticRef.current = onDiagnostic;
  onNavigateRef.current = onNavigate;
  onMutedChangeRef.current = onMutedChange;
  onTutorialSnapshotRef.current = onTutorialSnapshot;
  const resetTutorialCommandOwnership = (): void => {
    tutorialCommandQueueRef.current = Promise.resolve();
    tutorialCommandPendingRef.current = false;
    tutorialCommandGateRef.current = undefined;
  };
  const [status, setStatus] = useState<
    "loading" | "briefing" | "tutorial" | "demo" | "countdown" | "ready" | "paused" | "complete" | "error"
  >("loading");
  const sessionModeRef = useRef<"playing" | "tutorial" | "demo">("playing");
  const [demoActive, setDemoActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [result, setResult] = useState<GameResults>();
  const [resultEvidence, setResultEvidence] = useState<LearningEvidence>();
  const [resultOutcome, setResultOutcome] = useState<GameTerminalOutcome>("complete");
  const [persistence, setPersistence] = useState<GamePersistenceState>({ status: "not-applicable" });
  const [error, setError] = useState<string>();
  const [briefingStarted, setBriefingStarted] = useState(false);
  const [briefingRevision, setBriefingRevision] = useState(0);
  const [tutorialSnapshot, setTutorialSnapshot] = useState<GameTutorialControllerSnapshot>();
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent): void => setReducedMotion(event.matches);
    setReducedMotion(query.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const briefingValidation = effectiveBriefing === undefined
    ? undefined
    : gameBriefingSchema.safeParse(effectiveBriefing);
  const inputValidation = effectiveBriefing === undefined
    ? undefined
    : (cartridge.manifest.inputMode === "sentence" ? sentenceInputSchema : vocabularyInputSchema)
      .safeParse(input);
  const validationError = briefingValidation && !briefingValidation.success
    ? "Briefing validation failed. Check the title, objective, instructions, learning preview, and controls."
    : inputValidation && !inputValidation.success
      ? "Learning input validation failed. Check every term and translation before starting the game."
      : undefined;
  const briefingVisible = effectiveBriefing !== undefined
    && briefingValidation?.success === true
    && inputValidation?.success === true
    && !briefingStarted;
  const tutorialControlsReady = status !== "tutorial"
    || (
      tutorialSessionRef.current?.controller === tutorialControllerRef.current
      && tutorialSessionRef.current?.tutorial === effectiveTutorial
      && tutorialSessionRef.current?.standardExperience === standardExperience
      && tutorialSessionRef.current?.tutorialActionDriver === tutorialActionDriver
      && tutorialSessionRef.current?.tutorialClock === tutorialClock
    );
  const controlsHidden = (effectiveBriefing !== undefined
    && (!briefingStarted
      || status === "briefing"
      || status === "error"
      || (!demoActive && (status === "loading" || status === "countdown"))))
    || status === "complete"
    || !tutorialControlsReady;
  const minimumControlHeight = Math.max(
    48,
    (responsive?.config.minimumTouchTargetPx ?? 48) * (responsive?.accessibility.touchScale ?? 1),
  );
  const controlStyle = { minHeight: `${minimumControlHeight}px` } as const;

  const detachTutorialController = (): GameTutorialController | undefined => {
    const controller = tutorialControllerRef.current;
    tutorialControllerRef.current = undefined;
    return controller;
  };

  const retainCleanupOwnership = (
    mountPoint: HTMLDivElement | undefined,
    controller: GameTutorialController | undefined,
    handle: APKGameHandle | undefined,
    driver?: GameTutorialActionDriver & { readonly destroy?: () => void | Promise<void> },
  ): void => {
    if (controller === undefined && handle === undefined && driver === undefined) return;
    const owner = pendingCleanupRef.current;
    if (owner) {
      owner.mountPoint ??= mountPoint;
      owner.controller ??= controller;
      owner.driver ??= driver;
      owner.handle ??= handle;
      return;
    }
    pendingCleanupRef.current = {
      mountPoint,
      ...(controller ? { controller } : {}),
      ...(driver ? { driver } : {}),
      ...(handle ? { handle } : {}),
    };
  };

  const cleanupPendingResources = async (): Promise<void> => {
    if (cleanupAttemptRef.current) return cleanupAttemptRef.current;
    const owner = pendingCleanupRef.current;
    if (!owner) return;
    const controller = owner.controller;
    const driver = owner.driver;
    const handle = owner.handle;
    const cleanup = (async (): Promise<void> => {
      const [controllerResult, driverResult, handleResult] = await Promise.allSettled([
        Promise.resolve().then(() => controller?.destroy()),
        Promise.resolve().then(() => driver?.destroy?.()),
        Promise.resolve().then(() => handle?.destroy()),
      ]);
      if (pendingCleanupRef.current === owner) {
        if (controllerResult.status === "fulfilled" && owner.controller === controller) {
          owner.controller = undefined;
        }
        if (driverResult.status === "fulfilled" && owner.driver === driver) owner.driver = undefined;
        if (handleResult.status === "fulfilled" && owner.handle === handle) owner.handle = undefined;
        if (owner.controller === undefined && owner.driver === undefined && owner.handle === undefined) {
          pendingCleanupRef.current = undefined;
          owner.mountPoint?.replaceChildren();
        }
      }
      if (controllerResult.status === "rejected") throw controllerResult.reason;
      if (driverResult.status === "rejected") throw driverResult.reason;
      if (handleResult.status === "rejected") throw handleResult.reason;
    })();
    cleanupAttemptRef.current = cleanup;
    let cleanupFailed = false;
    let cleanupFailure: unknown;
    try {
      await cleanup;
    } catch (error) {
      cleanupFailed = true;
      cleanupFailure = error;
    } finally {
      if (cleanupAttemptRef.current === cleanup) cleanupAttemptRef.current = undefined;
    }
    const remaining = pendingCleanupRef.current;
    const hasUnattemptedResource = remaining !== undefined && (
      (remaining.controller !== undefined && remaining.controller !== controller)
      || (remaining.driver !== undefined && remaining.driver !== driver)
      || (remaining.handle !== undefined && remaining.handle !== handle)
    );
    if (hasUnattemptedResource) {
      try {
        await cleanupPendingResources();
      } catch (error) {
        if (!cleanupFailed) cleanupFailure = error;
        cleanupFailed = true;
      }
    }
    if (cleanupFailed) throw cleanupFailure;
  };

  const cleanupTutorialSession = async (
    mountPoint: HTMLDivElement | undefined,
    controller: GameTutorialController | undefined,
    handle: APKGameHandle | undefined,
    driver?: GameTutorialActionDriver & { readonly destroy?: () => void | Promise<void> },
  ): Promise<void> => {
    retainCleanupOwnership(mountPoint, controller, handle, driver);
    await cleanupPendingResources();
  };

  const destroyTutorialController = async (): Promise<void> => {
    await cleanupTutorialSession(mountPointRef.current, detachTutorialController(), undefined);
  };

  const isCurrentMount = (mountPoint: HTMLDivElement, generation: number): boolean =>
    mountPointRef.current === mountPoint && mountGenerationRef.current === generation;

  const clearProvisionalPlaying = (generation: number): void => {
    if (provisionalPlayingGenerationRef.current === generation) {
      provisionalPlayingGenerationRef.current = undefined;
    }
    if (resumingGenerationRef.current === generation) {
      resumingGenerationRef.current = undefined;
    }
    if (provisionalCompletionRef.current?.generation === generation) {
      provisionalCompletionRef.current = undefined;
    }
  };

  const returnToBriefing = (
    mountPoint: HTMLDivElement,
    generation: number,
    message: string,
  ): void => {
    if (!isCurrentMount(mountPoint, generation)) return;
    retainCleanupOwnership(mountPoint, detachTutorialController(), handleRef.current);
    mountGenerationRef.current = generation + 1;
    handleRef.current = undefined;
    playingGenerationRef.current = undefined;
    resumingGenerationRef.current = undefined;
    provisionalPlayingGenerationRef.current = undefined;
    provisionalCompletionRef.current = undefined;
    tutorialSessionRef.current = undefined;
    tutorialTransitionTokenRef.current = undefined;
    resetTutorialCommandOwnership();
    setDemoActive(false);
    sessionModeRef.current = "playing";
    briefingStartGuardRef.current = false;
    setBriefingStarted(false);
    setBriefingRevision((revision) => revision + 1);
    setError(message);
    setStatus(effectiveBriefing === undefined ? "error" : "briefing");
  };

  const teardownDemo = async (failureMessage: string, endDemoState = true): Promise<boolean> => {
    if (demoTeardownRef.current) return false;
    demoTeardownRef.current = true;
    const mountPoint = mountPointRef.current;
    const generation = mountGenerationRef.current + 1;
    const activeHandle = handleRef.current;
    retainCleanupOwnership(mountPoint, undefined, activeHandle);
    handleRef.current = undefined;
    playingGenerationRef.current = undefined;
    resumingGenerationRef.current = undefined;
    provisionalPlayingGenerationRef.current = undefined;
    provisionalCompletionRef.current = undefined;
    mountGenerationRef.current = generation;
    setStatus("loading");
    try {
      await cleanupPendingResources();
    } catch (teardownError) {
      demoTeardownRef.current = false;
      if (mountPoint && isCurrentMount(mountPoint, generation)) {
        returnToBriefing(
          mountPoint,
          generation,
          teardownError instanceof Error ? teardownError.message : failureMessage,
        );
      }
      return false;
    }
    if (!mountPoint || !isCurrentMount(mountPoint, generation)) {
      demoTeardownRef.current = false;
      return false;
    }
    mountPoint.replaceChildren();
    if (endDemoState) {
      setDemoActive(false);
      sessionModeRef.current = "playing";
    }
    demoTeardownRef.current = false;
    return true;
  };

  const emitLifecycleTransition = (transition: GameLifecycleTransition): boolean => {
    lifecycleErrorRef.current = undefined;
    try {
      onLifecycleTransitionRef.current?.(transition);
      return true;
    } catch (transitionError) {
      lifecycleErrorRef.current = transitionError instanceof Error
        ? transitionError.message
        : "Game lifecycle signal failed";
      setError(lifecycleErrorRef.current);
      setStatus("error");
      return false;
    }
  };

  const notifyNavigation = (destination: string): void => {
    try {
      onNavigateRef.current?.(destination);
    } catch {
      // Owner navigation observers cannot interrupt runtime lifecycle work.
    }
  };

  const persistCompletion = async (
    mountPoint: HTMLDivElement,
    generation: number,
    completionAuthority: number,
    nextResult: GameResults,
    outcome: GameTerminalOutcome,
    evidence?: LearningEvidence,
  ): Promise<void> => {
    persistencePendingAuthorityRef.current = completionAuthority;
    const complete = onCompleteRef.current;
    if (!complete) {
      setPersistence({ status: "not-applicable" });
      persistencePendingAuthorityRef.current = undefined;
      return;
    }
    setPersistence({ status: "pending" });
    const timeoutMs = Number.isFinite(persistenceTimeoutMs) && persistenceTimeoutMs > 0
      ? persistenceTimeoutMs
      : DEFAULT_PERSISTENCE_TIMEOUT_MS;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    try {
      const confirmation = await Promise.race([
        Promise.resolve().then(() => evidence
          ? complete(nextResult, outcome, evidence)
          : complete(nextResult, outcome)),
        new Promise<never>((_resolve, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error("Game progress could not be confirmed in time.")),
            timeoutMs,
          );
        }),
      ]);
      if (!isCurrentMount(mountPoint, generation)
        || completionAuthorityRef.current !== completionAuthority) return;
      if (confirmation === undefined) {
        setPersistence({ status: "not-applicable" });
        return;
      }
      if (!Number.isInteger(confirmation.xpEarned)
        || confirmation.xpEarned < 0
        || typeof confirmation.duplicate !== "boolean") {
        throw new Error("The host completion confirmation is invalid.");
      }
      setPersistence({
        status: "confirmed",
        xpEarned: confirmation.xpEarned,
        duplicate: confirmation.duplicate,
      });
    } catch (completionError) {
      if (!isCurrentMount(mountPoint, generation)
        || completionAuthorityRef.current !== completionAuthority) return;
      setPersistence({
        status: "failed",
        message: completionError instanceof Error
          ? completionError.message
          : "Game progress could not be saved.",
      });
    } finally {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      if (persistencePendingAuthorityRef.current === completionAuthority) {
        persistencePendingAuthorityRef.current = undefined;
      }
    }
  };

  const acceptCompletion = async (
    mountPoint: HTMLDivElement,
    generation: number,
    nextResult: GameResults,
    outcome: GameTerminalOutcome,
    evidence?: LearningEvidence,
  ): Promise<boolean> => {
    if (!isCurrentMount(mountPoint, generation) || playingGenerationRef.current !== generation) return false;
    const activeHandle = handleRef.current;
    try {
      activeHandle?.pause();
    } catch (pauseError) {
      if (activeHandle) {
        await discardMountedHandle(
          mountPoint,
          generation,
          activeHandle,
          pauseError instanceof Error ? pauseError.message : "The completed game could not pause.",
        );
      }
      return false;
    }
    const transition = gameLifecycleTransitionSchema.parse({
      from: "playing",
      event: "game-complete",
      to: "results",
    });
    if (!emitLifecycleTransition(transition)) {
      if (activeHandle) {
        await discardMountedHandle(
          mountPoint,
          generation,
          activeHandle,
          lifecycleErrorRef.current ?? "The completed game could not enter results.",
        );
      }
      return false;
    }
    setResult(nextResult);
    setResultEvidence(evidence);
    setResultOutcome(outcome);
    setStatus("complete");
    const completionAuthority = completionAuthorityRef.current + 1;
    completionAuthorityRef.current = completionAuthority;
    void persistCompletion(mountPoint, generation, completionAuthority, nextResult, outcome, evidence);
    return true;
  };

  const discardMountedHandle = async (
    mountPoint: HTMLDivElement,
    generation: number,
    handle: APKGameHandle,
    message: string,
  ): Promise<void> => {
    const isCurrent = isCurrentMount(mountPoint, generation);
    const invalidatedGeneration = generation + 1;
    if (isCurrent) {
      handleRef.current = undefined;
      playingGenerationRef.current = undefined;
      resumingGenerationRef.current = undefined;
      provisionalPlayingGenerationRef.current = undefined;
      provisionalCompletionRef.current = undefined;
      mountGenerationRef.current = invalidatedGeneration;
    }
    await cleanupTutorialSession(mountPoint, undefined, handle).catch(() => undefined);
    if (!isCurrent) return;
    returnToBriefing(mountPoint, invalidatedGeneration, message);
  };

  const flushProvisionalCompletion = async (
    mountPoint: HTMLDivElement,
    generation: number,
  ): Promise<boolean> => {
    const pending = provisionalCompletionRef.current;
    provisionalCompletionRef.current = undefined;
    if (pending === undefined || pending.generation !== generation) return true;
    return acceptCompletion(mountPoint, generation, pending.result, pending.outcome, pending.evidence);
  };

  const activatePlayingMount = async (
    mountPoint: HTMLDivElement,
    generation: number,
    handle: APKGameHandle,
    transitions: readonly GameLifecycleTransition[] = [],
  ): Promise<boolean> => {
    if (!isCurrentMount(mountPoint, generation)) {
      await discardMountedHandle(mountPoint, generation, handle, "The game could not enter authoritative play.");
      return false;
    }
    if (transitions.length > 0) {
      resumingGenerationRef.current = generation;
      try {
        handle.resume();
      } catch (resumeError) {
        clearProvisionalPlaying(generation);
        await discardMountedHandle(
          mountPoint,
          generation,
          handle,
          resumeError instanceof Error ? resumeError.message : "The game could not resume.",
        );
        return false;
      }
      resumingGenerationRef.current = undefined;
      if (!isCurrentMount(mountPoint, generation)) {
        clearProvisionalPlaying(generation);
        await discardMountedHandle(mountPoint, generation, handle, "The game could not enter authoritative play.");
        return false;
      }
      for (const transition of transitions) {
        if (!isCurrentMount(mountPoint, generation) || !emitLifecycleTransition(transition)) {
          clearProvisionalPlaying(generation);
          await discardMountedHandle(
            mountPoint,
            generation,
            handle,
            lifecycleErrorRef.current ?? "The game could not enter authoritative play.",
          );
          return false;
        }
      }
    }
    if (!isCurrentMount(mountPoint, generation)) {
      clearProvisionalPlaying(generation);
      await discardMountedHandle(mountPoint, generation, handle, "The game could not enter authoritative play.");
      return false;
    }
    playingGenerationRef.current = generation;
    provisionalPlayingGenerationRef.current = undefined;
    setStatus("ready");
    return flushProvisionalCompletion(mountPoint, generation);
  };

  const mountGame = async (
    mountPoint: HTMLDivElement,
    generation: number,
    sessionMode: "playing" | "tutorial" | "demo" = "playing",
    pauseAfterMount = false,
    recoverToBriefingOnFailure = false,
    providedAnswerAudio?: AnswerChoiceAudioController,
  ): Promise<APKGameHandle | undefined> => {
    const previousMount = mountQueueRef.current;
    let releaseMount: () => void = () => undefined;
    const currentMount = new Promise<void>((resolve) => {
      releaseMount = resolve;
    });
    mountQueueRef.current = currentMount;
    await previousMount.catch(() => undefined);
    let unownedListening: ListeningAudioController | undefined;
    let unownedAnswerAudio = providedAnswerAudio;
    try {
    try {
      await cleanupPendingResources();
    } catch (cleanupError) {
      if (!isCurrentMount(mountPoint, generation)) return undefined;
      const message = cleanupError instanceof Error ? cleanupError.message : "Game cleanup failed";
      setError(message);
      if (recoverToBriefingOnFailure) returnToBriefing(mountPoint, generation, message);
      else setStatus("error");
      return undefined;
    }
    if (!isCurrentMount(mountPoint, generation)) return undefined;
    sessionModeRef.current = sessionMode;
    if (sessionMode === "playing") {
      provisionalPlayingGenerationRef.current = generation;
      provisionalCompletionRef.current = undefined;
    } else {
      clearProvisionalPlaying(generation);
    }
    const sessionSeed = sessionMode === "demo" && seed === undefined ? DEFAULT_DEMO_SEED : seed;
    try {
      unownedListening = sessionMode === "playing" ? createListeningSession?.() : undefined;
      unownedAnswerAudio ??= sessionMode === "playing" ? createAnswerAudioSession?.() : undefined;
      const handle = await mountCartridge(
        {
          container: mountPoint,
          cartridge,
          input,
          edition,
          sessionMode,
          host: {
            complete: async (nextResult, outcome = "complete", evidence) => {
              if (!isCurrentMount(mountPoint, generation) || sessionMode !== "playing") return;
              if (playingGenerationRef.current !== generation) {
                if (
                  provisionalPlayingGenerationRef.current === generation
                  || resumingGenerationRef.current === generation
                ) {
                  provisionalCompletionRef.current = {
                    generation,
                    result: nextResult,
                    outcome,
                    ...(evidence ? { evidence } : {}),
                  };
                }
                return;
              }
              await acceptCompletion(mountPoint, generation, nextResult, outcome, evidence);
            },
            navigate: (destination) => {
              if (!isCurrentMount(mountPoint, generation)) return;
              notifyNavigation(destination);
            },
            diagnostic: (event) => {
              if (!isCurrentMount(mountPoint, generation)) return;
              try {
                onDiagnosticRef.current?.(event);
              } catch {
                // Owner diagnostic observers cannot interrupt runtime lifecycle work.
              }
            },
          },
          ...(sessionSeed === undefined ? {} : { seed: sessionSeed }),
          ...(responsive === undefined ? {} : { responsive }),
          ...(unownedListening === undefined ? {} : { listening: unownedListening }),
          ...(unownedAnswerAudio === undefined ? {} : { answerAudio: unownedAnswerAudio }),
        },
        factory ?? createPhaserGameFactory(),
      );
      unownedListening = undefined;
      unownedAnswerAudio = undefined;
      if (muted) {
        try {
          handle.setMuted(true);
        } catch (muteError) {
          await cleanupTutorialSession(mountPoint, undefined, handle).catch(() => undefined);
          throw muteError;
        }
      }
      if (!isCurrentMount(mountPoint, generation)) {
        clearProvisionalPlaying(generation);
        await cleanupTutorialSession(mountPoint, undefined, handle).catch(() => undefined);
        return undefined;
      }
      if (pauseAfterMount) {
        try {
          handle.pause();
        } catch (pauseError) {
          await cleanupTutorialSession(mountPoint, undefined, handle).catch(() => undefined);
          throw pauseError;
        }
      }
      handleRef.current = handle;
      setDemoActive(sessionMode === "demo");
      if (sessionMode === "playing" && !pauseAfterMount) {
        if (!await activatePlayingMount(mountPoint, generation, handle)) return undefined;
        return handle;
      }
      setStatus(
        sessionMode === "tutorial"
          ? "tutorial"
          : sessionMode === "demo"
            ? "demo"
            : pauseAfterMount
              ? "countdown"
              : "ready",
      );
      return handle;
    } catch (mountError: unknown) {
      try {
        unownedListening?.destroy();
      } catch {
        // Failed controller cleanup cannot replace the original mount error.
      }
      try {
        unownedAnswerAudio?.destroy();
      } catch {
        // Failed controller cleanup cannot replace the original mount error.
      }
      unownedListening = undefined;
      unownedAnswerAudio = undefined;
      if (!isCurrentMount(mountPoint, generation)) return undefined;
      clearProvisionalPlaying(generation);
      await destroyTutorialController().catch(() => undefined);
      if (!isCurrentMount(mountPoint, generation)) return undefined;
      if (sessionMode === "demo") {
        setDemoActive(false);
        sessionModeRef.current = "playing";
      }
      const message = mountError instanceof Error ? mountError.message : "Game failed to start";
      setError(message);
      if (recoverToBriefingOnFailure) {
        returnToBriefing(mountPoint, generation, message);
      } else {
        setStatus("error");
      }
      return undefined;
    }
    } finally {
      try {
        unownedAnswerAudio?.destroy();
      } catch {
        // Failed controller cleanup cannot replace mount queue release.
      }
      releaseMount();
      if (mountQueueRef.current === currentMount) mountQueueRef.current = Promise.resolve();
    }
  };

  const enterPlayingFromTutorial = async (
    mountPoint: HTMLDivElement,
    generation: number,
    transition: GameLifecycleTransition,
    token: object,
    controller: GameTutorialController,
  ): Promise<void> => {
    if (!isCurrentMount(mountPoint, generation)) return;
    if (transition.to !== "playing" && transition.to !== "countdown") return;
    if (tutorialTransitionTokenRef.current !== token || tutorialSessionRef.current?.controller !== controller) return;

    setStatus("loading");
    const previewHandle = handleRef.current;
    handleRef.current = undefined;
    playingGenerationRef.current = undefined;
    tutorialSessionRef.current = undefined;
    resetTutorialCommandOwnership();
    const activeController = detachTutorialController();
    try {
      await cleanupTutorialSession(mountPoint, activeController, previewHandle);
    } catch (cleanupError) {
      if (!isCurrentMount(mountPoint, generation)) return;
      returnToBriefing(
        mountPoint,
        generation,
        cleanupError instanceof Error ? cleanupError.message : "The tutorial could not end.",
      );
      return;
    }
    if (!isCurrentMount(mountPoint, generation)) return;
    mountPoint.replaceChildren();
    setTutorialSnapshot(undefined);
    const mounted = await mountGame(mountPoint, generation, "playing", true, true);
    if (!mounted || !isCurrentMount(mountPoint, generation)) return;
    const playingTransitions = transition.to === "countdown"
      ? [
        transition,
        gameLifecycleTransitionSchema.parse({
          from: "countdown",
          event: "countdown-complete",
          to: "playing",
        }),
      ]
      : [transition];
    await activatePlayingMount(mountPoint, generation, mounted, playingTransitions);
  };

  const startTutorial = async (
    mountPoint: HTMLDivElement,
    generation: number,
    startTransition?: GameLifecycleTransition,
  ): Promise<void> => {
    if (effectiveTutorial === undefined) {
      const message = "The tutorial phase is not available in this host yet. The cartridge remains gated until its phase controller is available.";
      if (isCurrentMount(mountPoint, generation)) returnToBriefing(mountPoint, generation, message);
      return;
    }
    try {
      await cleanupPendingResources();
    } catch (cleanupError) {
      const message = cleanupError instanceof Error ? cleanupError.message : "The previous game could not close.";
      if (isCurrentMount(mountPoint, generation)) returnToBriefing(mountPoint, generation, message);
      return;
    }
    if (!isCurrentMount(mountPoint, generation)) return;
    let actionDriver: (GameTutorialActionDriver & {
      readonly destroy?: () => void | Promise<void>;
    }) | undefined;
    let tutorialAnswerAudio: AnswerChoiceAudioController | undefined;
    try {
      tutorialAnswerAudio = standardExperience && createAnswerAudioSession
        ? createAnswerAudioSession()
        : undefined;
      const answerAudio = tutorialAnswerAudio === undefined ? undefined : Object.freeze({
        setQuestion: tutorialAnswerAudio.setQuestion.bind(tutorialAnswerAudio),
        playChoice: tutorialAnswerAudio.playChoice.bind(tutorialAnswerAudio),
        getChoiceSnapshot: tutorialAnswerAudio.getChoiceSnapshot.bind(tutorialAnswerAudio),
      });
      actionDriver = standardExperience?.createTutorialActionDriver(
        answerAudio === undefined ? undefined : { answerAudio },
      ) ?? tutorialActionDriver;
    } catch (actionDriverError) {
      try {
        tutorialAnswerAudio?.destroy();
      } catch {
        // Audio cleanup cannot replace the tutorial construction error.
      }
      const message = actionDriverError instanceof Error ? actionDriverError.message : "The tutorial phase is not available in this host yet.";
      if (isCurrentMount(mountPoint, generation)) returnToBriefing(mountPoint, generation, message);
      return;
    }
    if (actionDriver === undefined) {
      const message = "The tutorial phase is not available in this host yet. The cartridge remains gated until its phase controller is available.";
      if (isCurrentMount(mountPoint, generation)) returnToBriefing(mountPoint, generation, message);
      return;
    }
    const effects: GameTutorialEffects = {
      emitGameResults: () => undefined,
      complete: () => undefined,
      persistProgress: () => undefined,
      awardAuthoritativeXp: () => undefined,
      writeLeaderboard: () => undefined,
      applyFailureConsequences: () => undefined,
    };
    const token = {};
    const controller = await (async (): Promise<GameTutorialController | undefined> => {
      try {
        return createGameTutorialController({
          tutorial: effectiveTutorial,
          actionDriver,
          clock: tutorialClock ?? createBrowserTutorialClock(),
          effects,
          onLifecycleTransition: (transition) => {
            const activeSession = tutorialSessionRef.current;
            if (
              !isCurrentMount(mountPoint, generation)
              || activeSession?.token !== token
              || tutorialTransitionTokenRef.current !== undefined
            ) return;
            const transitionGeneration = mountGenerationRef.current + 1;
            mountGenerationRef.current = transitionGeneration;
            tutorialTransitionTokenRef.current = token;
            const commandGate = tutorialCommandGateRef.current;
            const enterPlaying = async (): Promise<void> => {
              await enterPlayingFromTutorial(
                mountPoint,
                transitionGeneration,
                transition,
                token,
                activeSession.controller,
              );
            };
            void (commandGate?.controller === activeSession.controller && commandGate.token === token
              ? commandGate.promise
              : Promise.resolve()
            ).then(enterPlaying).catch(() => undefined);
          },
          onDiagnostic: undefined,
          onSnapshot: (snapshot) => {
            if (generation !== mountGenerationRef.current) return;
            setTutorialSnapshot(snapshot);
            try {
              onTutorialSnapshotRef.current?.({
                ...snapshot,
                ...(snapshot.currentTarget === undefined ? {} : { currentTarget: { id: snapshot.currentTarget.id } }),
              } as GameTutorialControllerSnapshot);
            } catch {
              // Owner tutorial observers cannot interrupt tutorial lifecycle work.
            }
          },
        });
      } catch (constructionError) {
        try {
          tutorialAnswerAudio?.destroy();
        } catch {
          // Audio cleanup cannot replace the tutorial construction error.
        }
        await cleanupTutorialSession(mountPoint, undefined, undefined, actionDriver).catch(() => undefined);
        const message = constructionError instanceof Error
          ? constructionError.message
          : "The tutorial could not be prepared.";
        if (isCurrentMount(mountPoint, generation)) returnToBriefing(mountPoint, generation, message);
        return undefined;
      }
    })();
    if (controller === undefined) return;
    resetTutorialCommandOwnership();
    tutorialControllerRef.current = controller;
    tutorialSessionRef.current = {
      token,
      controller,
      tutorial: effectiveTutorial,
      standardExperience,
      tutorialActionDriver,
      tutorialClock,
    };
    tutorialTransitionTokenRef.current = undefined;
    const mounted = await mountGame(mountPoint, generation, "tutorial", false, true, tutorialAnswerAudio);
    if (!mounted || generation !== mountGenerationRef.current) return;
    const recoverTutorialStart = async (message: string): Promise<void> => {
      tutorialSessionRef.current = undefined;
      resetTutorialCommandOwnership();
      const activeController = detachTutorialController();
      await cleanupTutorialSession(mountPoint, activeController, mounted).catch(() => undefined);
      if (isCurrentMount(mountPoint, generation)) returnToBriefing(mountPoint, generation, message);
    };
    try {
      await controller.start();
    } catch (startError) {
      const message = startError instanceof Error ? startError.message : "The tutorial could not start.";
      await recoverTutorialStart(message);
      return;
    }
    if (!isCurrentMount(mountPoint, generation) || tutorialSessionRef.current?.controller !== controller) return;
    if (startTransition !== undefined && !emitLifecycleTransition(startTransition)) {
      await recoverTutorialStart(lifecycleErrorRef.current ?? "The tutorial could not start.");
    }
  };

  /**
   * Mounts the real cartridge as a scored-session-free class demonstration.
   * @returns A promise that resolves after the demo session mounts or fails.
   */
  const mountDemoSession = async (): Promise<APKGameHandle | undefined> => {
    const mountPoint = mountPointRef.current;
    if (!mountPoint) {
      setError("The game surface is not ready. Try again.");
      setStatus("error");
      return undefined;
    }
    setResult(undefined);
    setResultOutcome("complete");
    setStatus("loading");
    return mountGame(mountPoint, mountGenerationRef.current, "demo", false, true);
  };

  /**
   * Starts a class demonstration from the briefing Demonstrate action.
   * @returns A promise that resolves after the demo mounts and emits its transition.
   */
  const startDemoFromBriefing = async (): Promise<void> => {
    if (
      briefingStartGuardRef.current
      || effectiveBriefing === undefined
      || !briefingValidation?.success
      || !inputValidation?.success
    ) {
      return;
    }
    briefingStartGuardRef.current = true;
    setBriefingStarted(true);
    setError(undefined);
    const transitionResult = gameLifecycleTransitionSchema.safeParse({
      from: "briefing",
      event: "start",
      to: "demo",
    });
    if (!transitionResult.success) {
      briefingStartGuardRef.current = false;
      setBriefingStarted(false);
      setError("The class demonstration could not start.");
      setStatus("error");
      return;
    }
    const mountPoint = mountPointRef.current;
    const generation = mountGenerationRef.current;
    const mounted = await mountDemoSession();
    if (!mounted) {
      if (mountPoint && isCurrentMount(mountPoint, generation)) {
        briefingStartGuardRef.current = false;
        setBriefingStarted(false);
        setStatus("briefing");
      } else if (!mountPoint) {
        briefingStartGuardRef.current = false;
        setBriefingStarted(false);
        setStatus("briefing");
      }
      return;
    }
    if (!mountPoint || !isCurrentMount(mountPoint, generation)) return;
    if (!emitLifecycleTransition(transitionResult.data)) {
      const message = lifecycleErrorRef.current ?? "The class demonstration could not start.";
      if (await teardownDemo(message) && mountPoint) {
        returnToBriefing(mountPoint, mountGenerationRef.current, message);
      }
      return;
    }
  };

  /**
   * Ends the class demonstration and returns the teacher to the briefing.
   * @returns A promise that resolves after the demo session is destroyed.
   */
  const endDemo = async (): Promise<void> => {
    if (demoTeardownRef.current) return;
    if (!await teardownDemo("The class demonstration could not end.")) return;
    const mountPoint = mountPointRef.current;
    const generation = mountGenerationRef.current;
    const transition = gameLifecycleTransitionSchema.parse({
      from: "demo",
      event: "demo-complete",
      to: "briefing",
    });
    if (!emitLifecycleTransition(transition)) {
      if (mountPoint) {
        returnToBriefing(
          mountPoint,
          generation,
          lifecycleErrorRef.current ?? "The class demonstration could not end.",
        );
      }
      return;
    }
    briefingStartGuardRef.current = false;
    setBriefingStarted(false);
    setBriefingRevision((revision) => revision + 1);
    setStatus("briefing");
  };

  /**
   * Remounts the current class demonstration on the same cartridge.
   * @returns A promise that resolves after the demo restarts.
   */
  const restartDemo = async (): Promise<void> => {
    if (demoTeardownRef.current) return;
    setError(undefined);
    if (!await teardownDemo("The class demonstration could not restart.", false)) return;
    await mountDemoSession();
  };

  /**
   * Ends the class demonstration before navigating away from the host.
   * @returns A promise that resolves after cleanup and optional navigation finish.
   */
  const exitDemo = async (): Promise<void> => {
    if (demoTeardownRef.current || onNavigateRef.current === undefined) return;
    setError(undefined);
    if (!await teardownDemo("The class demonstration could not exit.")) return;
    const navigate = onNavigateRef.current;
    const mountPoint = mountPointRef.current;
    const generation = mountGenerationRef.current;
    if (navigate === undefined) {
      if (mountPoint) returnToBriefing(mountPoint, generation, "Game navigation is unavailable.");
      return;
    }
    try {
      navigate(effectiveDebrief.exitDestination);
    } catch (navigationError) {
      if (mountPoint) {
        returnToBriefing(
          mountPoint,
          generation,
          navigationError instanceof Error ? navigationError.message : "Game navigation failed",
        );
      }
    }
  };

  /**
   * Cleans the current game or practice session before host-owned navigation.
   * @returns A promise that resolves after cleanup and the navigation request.
   */
  const exitSession = async (): Promise<void> => {
    if (demoTeardownRef.current || onNavigateRef.current === undefined) return;
    demoTeardownRef.current = true;
    setError(undefined);
    completionAuthorityRef.current += 1;
    persistencePendingAuthorityRef.current = undefined;
    const mountPoint = mountPointRef.current;
    const generation = mountGenerationRef.current + 1;
    const activeHandle = handleRef.current;
    const activeController = detachTutorialController();
    handleRef.current = undefined;
    playingGenerationRef.current = undefined;
    resumingGenerationRef.current = undefined;
    provisionalPlayingGenerationRef.current = undefined;
    provisionalCompletionRef.current = undefined;
    tutorialSessionRef.current = undefined;
    tutorialTransitionTokenRef.current = undefined;
    resetTutorialCommandOwnership();
    mountGenerationRef.current = generation;
    setStatus("loading");
    try {
      await cleanupTutorialSession(mountPoint, activeController, activeHandle);
    } catch (cleanupError) {
      demoTeardownRef.current = false;
      if (mountPoint && isCurrentMount(mountPoint, generation)) {
        returnToBriefing(
          mountPoint,
          generation,
          cleanupError instanceof Error ? cleanupError.message : "The game could not exit.",
        );
      }
      return;
    }
    if (!mountPoint || !isCurrentMount(mountPoint, generation)) {
      demoTeardownRef.current = false;
      return;
    }
    mountPoint.replaceChildren();
    if (mutedRef.current) {
      mutedRef.current = false;
      setMuted(false);
      try {
        onMutedChangeRef.current?.(false);
      } catch {
        // External audio observers cannot interrupt game cleanup.
      }
    }
    demoTeardownRef.current = false;
    const navigate = onNavigateRef.current;
    if (navigate === undefined) return;
    try {
      navigate(effectiveDebrief.exitDestination);
    } catch (navigationError) {
      returnToBriefing(
        mountPoint,
        generation,
        navigationError instanceof Error ? navigationError.message : "Game navigation failed",
      );
    }
  };

  /**
   * Skips the class demonstration and starts authoritative gameplay immediately.
   * @returns A promise that resolves after the demo session is replaced with a scored session.
   */
  const skipDemo = async (): Promise<void> => {
    if (demoTeardownRef.current) return;
    const mountPoint = mountPointRef.current;
    if (!mountPoint) {
      setError("The game surface is not ready. Try again.");
      setStatus("error");
      return;
    }
    setError(undefined);
    if (!await teardownDemo("The class demonstration could not be skipped.", false)) return;
    const demoToCountdown = gameLifecycleTransitionSchema.parse({
      from: "demo",
      event: "demo-complete",
      to: "countdown",
    });
    const generation = mountGenerationRef.current;
    setTutorialSnapshot(undefined);
    setBriefingStarted(true);
    setStatus("loading");
    const mounted = await mountGame(mountPoint, generation, "playing", true, true);
    if (!mounted) return;
    const countdownToPlaying = gameLifecycleTransitionSchema.parse({
      from: "countdown",
      event: "countdown-complete",
      to: "playing",
    });
    await activatePlayingMount(mountPoint, generation, mounted, [demoToCountdown, countdownToPlaying]);
  };

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const externalMuteObserver = onMutedChangeRef.current;
    const existingMountPoint = surface.firstElementChild;
    const mountPoint = existingMountPoint instanceof HTMLDivElement
      && existingMountPoint.dataset.apkRuntimeMount === "true"
      ? existingMountPoint
      : document.createElement("div");
    mountPoint.dataset.apkRuntimeMount = "true";
    mountPoint.style.width = "100%";
    mountPoint.style.height = "100%";
    surface.replaceChildren(mountPoint);
    mountPointRef.current = mountPoint;
    if (mutedRef.current) {
      try {
        externalMuteObserver?.(true);
      } catch {
        // External audio observers cannot interrupt game mounting.
      }
    }
    const generation = mountGenerationRef.current + 1;
    mountGenerationRef.current = generation;
    briefingStartGuardRef.current = false;
    setBriefingStarted(false);
    setBriefingRevision((revision) => revision + 1);
    setDemoActive(false);
    setError(undefined);
    setResult(undefined);
    setResultOutcome("complete");

    demoTeardownRef.current = false;
    playingGenerationRef.current = undefined;
    resumingGenerationRef.current = undefined;
    provisionalPlayingGenerationRef.current = undefined;
    provisionalCompletionRef.current = undefined;
    resetTutorialCommandOwnership();

    if (launchPhase === "demo") {
      setBriefingStarted(true);
      setStatus("loading");
      void mountGame(mountPoint, generation, "demo", false, true);
    } else if (effectiveBriefing !== undefined) {
      if (validationError) {
        setStatus("error");
      } else {
        setStatus("briefing");
      }
    } else {
      setStatus("loading");
      void mountGame(mountPoint, generation, "playing", false, true);
    }

    return () => {
      if (mutedRef.current) {
        try {
          externalMuteObserver?.(false);
        } catch {
          // External audio observers cannot interrupt game cleanup.
        }
      }
      mountGenerationRef.current += 1;
      const mountedHandle = handleRef.current;
      handleRef.current = undefined;
      playingGenerationRef.current = undefined;
      resumingGenerationRef.current = undefined;
      provisionalPlayingGenerationRef.current = undefined;
      provisionalCompletionRef.current = undefined;
      tutorialSessionRef.current = undefined;
      tutorialTransitionTokenRef.current = undefined;
      resetTutorialCommandOwnership();
      const mountedController = detachTutorialController();
      if (mountPointRef.current === mountPoint) mountPointRef.current = undefined;
      void cleanupTutorialSession(mountPoint, mountedController, mountedHandle).catch(() => undefined);
    };
    // The mount branch intentionally preserves the legacy immediate-launch behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cartridge,
    createListeningSession,
    createAnswerAudioSession,
    edition,
    factory,
    input,
    responsive,
    seed,
    effectiveBriefing,
    effectiveTutorial,
    standardExperience,
    tutorialActionDriver,
    tutorialClock,
    validationError,
    launchPhase,
  ]);

  useEffect(() => {
    if (status !== "tutorial") return;
    handleRef.current?.resize?.();
  }, [status]);

  const startBriefing = async (requestedPhase?: "tutorial" | "playing"): Promise<void> => {
    if (
      briefingStartGuardRef.current
      || effectiveBriefing === undefined
      || !briefingValidation?.success
      || !inputValidation?.success
    ) {
      return;
    }

    briefingStartGuardRef.current = true;
    setBriefingStarted(true);
    setError(undefined);

    const resolvedStartPhase = requestedPhase ?? resolveGameBriefingStartPhase(effectiveBriefing);
    const transitionResult = gameLifecycleTransitionSchema.safeParse({
      from: "briefing",
      event: "start",
      to: resolvedStartPhase,
    });
    if (!transitionResult.success) {
      briefingStartGuardRef.current = false;
      setBriefingStarted(false);
      setError("The briefing could not continue because its lifecycle transition is invalid.");
      setStatus("briefing");
      return;
    }

    if (resolvedStartPhase === "demo") {
      const mountPoint = mountPointRef.current;
      const generation = mountGenerationRef.current;
      if (!mountPoint) {
        briefingStartGuardRef.current = false;
        setBriefingStarted(false);
        setError("The game surface is not ready. Try again.");
        setStatus("briefing");
        return;
      }
      const mounted = await mountDemoSession();
      if (!mounted) {
        if (isCurrentMount(mountPoint, generation)) {
          briefingStartGuardRef.current = false;
          setBriefingStarted(false);
        }
        return;
      }
      if (!isCurrentMount(mountPoint, generation)) {
        return;
      }
      if (!emitLifecycleTransition(transitionResult.data)) {
        const message = lifecycleErrorRef.current ?? "The class demonstration could not start.";
        if (await teardownDemo(message) && isCurrentMount(mountPoint, mountGenerationRef.current)) {
          returnToBriefing(mountPoint, mountGenerationRef.current, message);
        }
      }
      return;
    }

    if (resolvedStartPhase === "tutorial") {
      const mountPoint = mountPointRef.current;
      if (!mountPoint) {
        briefingStartGuardRef.current = false;
        setBriefingStarted(false);
        setError("The game surface is not ready. Try again.");
        setStatus("briefing");
        return;
      }
      setResult(undefined);
      setResultOutcome("complete");
      setStatus("loading");
      await startTutorial(mountPoint, mountGenerationRef.current, transitionResult.data);
      return;
    }
    if (resolvedStartPhase !== "playing") {
      const message = `The ${resolvedStartPhase} phase is not available in this host yet. The cartridge remains gated until its phase controller is available.`;
      const mountPoint = mountPointRef.current;
      if (mountPoint) {
        returnToBriefing(mountPoint, mountGenerationRef.current, message);
      } else {
        briefingStartGuardRef.current = false;
        setBriefingStarted(false);
        setError(message);
        setStatus("briefing");
      }
      return;
    }

    const mountPoint = mountPointRef.current;
    if (!mountPoint) {
      briefingStartGuardRef.current = false;
      setBriefingStarted(false);
      setError("The game surface is not ready. Try again.");
      setStatus("briefing");
      return;
    }

    setResult(undefined);
    setResultOutcome("complete");
    setStatus("loading");
    const generation = mountGenerationRef.current;
    const mounted = await mountGame(mountPoint, generation, "playing", true, true);
    if (!mounted || !isCurrentMount(mountPoint, generation)) return;
    await activatePlayingMount(mountPoint, generation, mounted, [transitionResult.data]);
  };

  const togglePause = async (): Promise<void> => {
    const handle = handleRef.current;
    const mountPoint = mountPointRef.current;
    const generation = mountGenerationRef.current;
    if (!handle || !mountPoint || !isCurrentMount(mountPoint, generation)) return;
    const authoritative = sessionModeRef.current === "playing"
      && playingGenerationRef.current === generation;
    if (authoritative) {
      playingGenerationRef.current = undefined;
      provisionalPlayingGenerationRef.current = generation;
      resumingGenerationRef.current = generation;
      provisionalCompletionRef.current = undefined;
    }
    const resuming = status === "paused";
    try {
      if (resuming) handle.resume();
      else handle.pause();
    } catch (commandError) {
      clearProvisionalPlaying(generation);
      await discardMountedHandle(
        mountPoint,
        generation,
        handle,
        commandError instanceof Error ? commandError.message : "The game control failed.",
      );
      return;
    }
    if (!isCurrentMount(mountPoint, generation)) return;
    const completedDuringCommand = provisionalCompletionRef.current?.generation === generation;
    if (authoritative) {
      resumingGenerationRef.current = undefined;
      playingGenerationRef.current = generation;
      provisionalPlayingGenerationRef.current = undefined;
      if (completedDuringCommand) {
        await flushProvisionalCompletion(mountPoint, generation);
        return;
      }
    }
    if (handle.getDiagnostics().status === "completed") return;
    setStatus(resuming ? (sessionModeRef.current === "demo" ? "demo" : "ready") : "paused");
    if (resuming && sessionModeRef.current === "playing") {
      surfaceRef.current?.parentElement?.focus({ preventScroll: true });
    }
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    handleRef.current?.setMuted(nextMuted);
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    try {
      onMutedChangeRef.current?.(nextMuted);
    } catch {
      // External audio observers cannot interrupt game controls.
    }
    if (status === "ready" && sessionModeRef.current === "playing") {
      surfaceRef.current?.parentElement?.focus({ preventScroll: true });
    }
  };

  const restart = async () => {
    completionAuthorityRef.current += 1;
    persistencePendingAuthorityRef.current = undefined;
    setPersistence({ status: "not-applicable" });
    if (demoActive) {
      await restartDemo();
      return;
    }
    if (launchPhase === "demo" && effectiveBriefing === undefined && handleRef.current === undefined) {
      setError(undefined);
      await mountDemoSession();
      return;
    }
    if (effectiveBriefing === undefined && handleRef.current === undefined) {
      setError(undefined);
      setResult(undefined);
      setResultOutcome("complete");
      setStatus("loading");
      const mountPoint = mountPointRef.current;
      if (!mountPoint) {
        setError("The game surface is not ready. Try again.");
        setStatus("error");
        return;
      }
      await mountGame(mountPoint, mountGenerationRef.current, "playing", false, true);
      return;
    }
    if (effectiveBriefing !== undefined) {
      const activeHandle = handleRef.current;
      const replayEntry = result ? effectiveDebrief.replayEntry : "briefing";
      const replayTransition = result
        ? gameLifecycleTransitionSchema.parse({
          from: "results",
          event: "replay",
          to: replayEntry,
        })
        : undefined;
      briefingStartGuardRef.current = true;
      setBriefingStarted(true);
      setError(undefined);
      setResult(undefined);
      setResultOutcome("complete");
      setStatus("loading");
      const mountPoint = mountPointRef.current;
      const generation = mountGenerationRef.current + 1;
      mountGenerationRef.current = generation;
      const activeController = detachTutorialController();
      tutorialSessionRef.current = undefined;
      tutorialTransitionTokenRef.current = undefined;
      playingGenerationRef.current = undefined;
      resumingGenerationRef.current = undefined;
      provisionalPlayingGenerationRef.current = undefined;
      provisionalCompletionRef.current = undefined;
      handleRef.current = undefined;
      sessionModeRef.current = "playing";
      resetTutorialCommandOwnership();

      try {
        await cleanupTutorialSession(mountPoint, activeController, activeHandle);
      } catch (restartError) {
        if (mountPoint && isCurrentMount(mountPoint, generation)) {
          returnToBriefing(
            mountPoint,
            generation,
            restartError instanceof Error ? restartError.message : "Game failed to restart",
          );
        }
        return;
      }

      if (!mountPoint || !isCurrentMount(mountPoint, generation)) {
        if (!mountPoint) {
          setError("The game surface is not ready. Try again.");
          setStatus("error");
        }
        return;
      }
      mountPoint.replaceChildren();
      if (replayEntry === "tutorial") {
        setBriefingStarted(true);
        await startTutorial(mountPoint, generation, replayTransition);
        return;
      }
      if (replayEntry === "playing") {
        setBriefingStarted(true);
        const mounted = await mountGame(mountPoint, generation, "playing", true, true);
        if (!mounted || !isCurrentMount(mountPoint, generation)) return;
        if (replayTransition !== undefined) {
          await activatePlayingMount(mountPoint, generation, mounted, [replayTransition]);
        }
        return;
      }

      briefingStartGuardRef.current = false;
      setBriefingStarted(false);
      setBriefingRevision((revision) => revision + 1);
      setStatus("briefing");
      if (replayTransition !== undefined) emitLifecycleTransition(replayTransition);
      return;
    }

    setError(undefined);
    setResult(undefined);
    setResultOutcome("complete");
    setStatus("loading");
    const activeHandle = handleRef.current;
    const mountPoint = mountPointRef.current;
    const generation = mountGenerationRef.current;
    completionAuthorityRef.current += 1;
    try {
      await activeHandle?.restart();
      if (!mountPoint || !isCurrentMount(mountPoint, generation) || handleRef.current !== activeHandle) return;
      if (activeHandle?.getDiagnostics().status !== "completed") setStatus("ready");
    } catch (restartError) {
      if (!mountPoint || !isCurrentMount(mountPoint, generation) || handleRef.current !== activeHandle) return;
      setError(restartError instanceof Error ? restartError.message : "Game failed to restart");
      setStatus("error");
    }
  };

  const retryPersistence = (): void => {
    const mountPoint = mountPointRef.current;
    const generation = mountGenerationRef.current;
    if (!mountPoint || !result || persistence.status !== "failed"
      || persistencePendingAuthorityRef.current !== undefined) return;
    const completionAuthority = completionAuthorityRef.current + 1;
    completionAuthorityRef.current = completionAuthority;
    void persistCompletion(
      mountPoint,
      generation,
      completionAuthority,
      result,
      resultOutcome,
      resultEvidence,
    );
  };

  const replayTutorial = async (): Promise<void> => {
    const mountPoint = mountPointRef.current;
    if (!mountPoint) return;
    const generation = mountGenerationRef.current + 1;
    mountGenerationRef.current = generation;
    const activeHandle = handleRef.current;
    handleRef.current = undefined;
    const activeController = detachTutorialController();
    tutorialSessionRef.current = undefined;
    tutorialTransitionTokenRef.current = undefined;
    resetTutorialCommandOwnership();
    clearProvisionalPlaying(generation - 1);
    playingGenerationRef.current = undefined;
    provisionalCompletionRef.current = undefined;
    setStatus("loading");
    setTutorialSnapshot(undefined);
    try {
      await cleanupTutorialSession(mountPoint, activeController, activeHandle);
    } catch (cleanupError) {
      if (!isCurrentMount(mountPoint, generation)) return;
      returnToBriefing(
        mountPoint,
        generation,
        cleanupError instanceof Error ? cleanupError.message : "The tutorial could not restart.",
      );
      return;
    }
    if (!isCurrentMount(mountPoint, generation)) return;
    mountPoint.replaceChildren();
    await startTutorial(mountPoint, generation);
  };

  const queueTutorialCommand = (
    controller: GameTutorialController,
    token: object,
    command: () => void | Promise<void>,
  ): void => {
    let releaseGate: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });

    const executeCommand = (): Promise<void> | undefined => {
      if (
        tutorialControllerRef.current !== controller
        || tutorialSessionRef.current?.token !== token
      ) {
        releaseGate();
        return undefined;
      }
      tutorialCommandGateRef.current = { controller, token, promise: gate };
      let commandResult: void | Promise<void>;
      try {
        commandResult = command();
      } catch (commandError) {
        if (tutorialCommandGateRef.current?.promise === gate) tutorialCommandGateRef.current = undefined;
        releaseGate();
        throw commandError;
      }
      if (commandResult === undefined) {
        if (tutorialCommandGateRef.current?.promise === gate) tutorialCommandGateRef.current = undefined;
        releaseGate();
        return undefined;
      }
      const settledCommand = Promise.resolve(commandResult).finally(() => {
        if (tutorialCommandGateRef.current?.promise === gate) tutorialCommandGateRef.current = undefined;
        releaseGate();
      });
      void settledCommand.catch(() => undefined);
      return settledCommand;
    };

    const trackCommand = (commandPromise: Promise<void>): void => {
      tutorialCommandQueueRef.current = commandPromise;
      tutorialCommandPendingRef.current = true;
      void commandPromise.catch((commandError: unknown) => {
        const mountPoint = mountPointRef.current;
        const generation = mountGenerationRef.current;
        if (
          !mountPoint
          || !isCurrentMount(mountPoint, generation)
          || tutorialControllerRef.current !== controller
          || tutorialSessionRef.current?.token !== token
        ) return;
        returnToBriefing(
          mountPoint,
          generation,
          commandError instanceof Error ? commandError.message : "The tutorial control failed.",
        );
      });
      void commandPromise
        .finally(() => {
          if (tutorialCommandQueueRef.current === commandPromise) {
            tutorialCommandPendingRef.current = false;
          }
        })
        .catch(() => undefined);
    };

    if (!tutorialCommandPendingRef.current) {
      try {
        const commandPromise = executeCommand();
        if (commandPromise !== undefined) trackCommand(commandPromise);
        else tutorialCommandQueueRef.current = Promise.resolve();
      } catch (commandError) {
        const failedCommand: Promise<void> = Promise.reject(commandError);
        trackCommand(failedCommand);
      }
      return;
    }

    const previous = tutorialCommandQueueRef.current;
    const queuedCommand = previous.catch(() => undefined).then(() => executeCommand());
    trackCommand(queuedCommand);
  };

  const runTutorialCommand = (command: "pause" | "resume" | "advance" | "replay" | "skip") => {
    const controller = tutorialControllerRef.current;
    const session = tutorialSessionRef.current;
    if (controller === undefined || session?.controller !== controller) return;
    if (command === "replay") {
      queueTutorialCommand(controller, session.token, replayTutorial);
      return;
    }
    if (command === "pause") {
      queueTutorialCommand(controller, session.token, async () => {
        await controller.pause();
        handleRef.current?.pause();
      });
      return;
    }
    if (command === "resume") {
      queueTutorialCommand(controller, session.token, async () => {
        handleRef.current?.resume();
        await controller.resume();
      });
      return;
    }
    queueTutorialCommand(controller, session.token, () => controller[command]());
  };

  return (
    <section
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      data-apk-visual-theme="retro-arcade"
      {...sectionProps}
      data-apk-session-phase={status}
      style={{
        position: "relative",
        overflow: "hidden",
        border: "2px solid var(--apk-shell-border, #31577d)",
        borderRadius: "2px",
        background: "var(--apk-shell-background, #060b18)",
        boxShadow: "6px 6px 0 var(--apk-shell-shadow, #030712)",
        color: "var(--apk-shell-text, #f7f2d0)",
        fontFamily: "var(--apk-shell-body-font, Tahoma, 'Noto Sans Thai', sans-serif)",
        ...hostStyle,
      }}
    >
      <div
        aria-live="polite"
        aria-atomic="true"
        data-apk-shell-status="true"
        style={{
          position: "absolute",
          inlineSize: "1px",
          blockSize: "1px",
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        {status === "loading" && "Loading game..."}
        {status === "briefing" && "Game briefing ready"}
        {status === "tutorial" && "Guided tutorial ready"}
        {status === "demo" && "Class demonstration ready"}
        {status === "countdown" && "Game starting"}
        {status === "ready" && "Game ready"}
        {status === "paused" && "Game paused"}
        {status === "complete" && "Game complete"}
      </div>
      {instructions && (
        <div style={{ borderBlockEnd: "1px solid #31577d", background: "#081225", color: "#a8c7dc", fontSize: "0.82rem", padding: "0.45rem 0.75rem" }}>
          {instructions}
        </div>
      )}
      {(validationError ?? error) && (
        <div role="alert">
          Game could not start: {validationError ?? error}
          {effectiveBriefing !== undefined
            && error
            && (briefingStarted || pendingCleanupRef.current !== undefined) ? (
            <button type="button" onClick={() => void restart()}>
              Return to briefing
            </button>
          ) : null}
        </div>
      )}
      {briefingVisible && briefingValidation?.success && inputValidation?.success ? (
        <GameBriefingScreen
          key={`briefing-${briefingRevision}`}
          briefing={briefingValidation.data}
          learningItems={inputValidation.data}
          onStart={() => void startBriefing(standardExperience ? "playing" : undefined)}
          onPractice={effectiveTutorial ? () => void startBriefing("tutorial") : undefined}
          onDemonstrate={startDemoFromBriefing}
          layoutProfile={layoutProfile}
          inputMode={inputMode}
          startPending={briefingStartGuardRef.current}
          extension={briefingExtension}
        />
      ) : null}
      {demoActive ? (
        <div role="status" data-apk-demo-banner="true">
          Class demonstration — scores are not saved
        </div>
      ) : null}
      {status === "tutorial"
        && effectiveTutorial
        && tutorialSnapshot
        && tutorialControlsReady
        && tutorialControllerRef.current ? (
          <GameTutorialScreen
            tutorial={effectiveTutorial}
            snapshot={tutorialSnapshot}
            controller={tutorialControllerRef.current}
            layoutProfile={layoutProfile}
            reducedMotion={reducedMotion}
            showControls={false}
            compactLandmarks
          />
        ) : null}
      {tutorialSnapshot?.phase === "tutorial" ? (
        <div
          role="group"
          aria-label="Game controls"
          data-apk-game-controls="true"
          data-apk-practice-controls="true"
          hidden={controlsHidden}
          style={{
            display: controlsHidden ? "none" : "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(7rem, 100%), 1fr))",
            lineHeight: 1.1,
          }}
        >
          <button
            type="button"
            aria-label={tutorialSnapshot.status === "paused" ? effectiveTutorial?.labels.resume : effectiveTutorial?.labels.pause}
            className="min-h-12"
            style={controlStyle}
            onClick={() => runTutorialCommand(tutorialSnapshot.status === "paused" ? "resume" : "pause")}
          >
            {tutorialSnapshot.status === "paused" ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            aria-label={tutorialSnapshot.currentStepDemonstrated
              && tutorialSnapshot.progress.completed === tutorialSnapshot.progress.total - 1
              ? effectiveBriefing?.labels?.startAction ?? "Start game"
              : effectiveTutorial?.labels.advance}
            className="min-h-12"
            style={controlStyle}
            onClick={() => runTutorialCommand("advance")}
          >
            {tutorialSnapshot.currentStepDemonstrated
              && tutorialSnapshot.progress.completed === tutorialSnapshot.progress.total - 1
              ? effectiveBriefing?.labels?.startAction ?? "Start game"
              : "Next"}
          </button>
          <button type="button" aria-label={effectiveTutorial?.labels.replay} className="min-h-12" style={controlStyle} onClick={() => runTutorialCommand("replay")}>Replay</button>
          <button type="button" aria-label={effectiveTutorial?.labels.skip} className="min-h-12" style={controlStyle} onClick={() => runTutorialCommand("skip")}>Skip</button>
          <button type="button" aria-label={muted ? "Unmute game" : "Mute game"} className="min-h-12" style={controlStyle} onClick={toggleMute} disabled={status === "loading" || status === "error" || controlsHidden}>
            {muted ? "Unmute" : "Mute"}
          </button>
          {onNavigate ? (
            <button type="button" aria-label="Exit practice" className="min-h-12" style={controlStyle} onClick={() => void exitSession()} disabled={status === "loading" || status === "error" || controlsHidden}>
              Exit
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        ref={surfaceRef}
        data-apk-canvas-host="true"
        aria-hidden="true"
        hidden={status === "complete"}
      />
      {tutorialSnapshot?.phase !== "tutorial" ? <div
        role="group"
        aria-label="Game controls"
        data-apk-game-controls="true"
        hidden={controlsHidden}
        style={{ display: controlsHidden ? "none" : undefined }}
      >
        {demoActive ? (
          <>
            <button type="button" className="min-h-12" style={controlStyle} onClick={() => void togglePause()} disabled={status === "loading" || status === "error"}>
              {status === "paused" ? "Resume demonstration" : "Pause demonstration"}
            </button>
            <button type="button" className="min-h-12" style={controlStyle} onClick={() => void restartDemo()} disabled={status === "loading" || status === "error"}>
              Restart demonstration
            </button>
            {effectiveBriefing !== undefined ? (
              <button type="button" className="min-h-12" style={controlStyle} onClick={() => void endDemo()} disabled={status === "loading" || status === "error"}>
                Advance demonstration
              </button>
            ) : null}
            <button type="button" className="min-h-12" style={controlStyle} onClick={() => void skipDemo()} disabled={status === "loading" || status === "error"}>
              Skip demonstration
            </button>
            {onNavigate ? (
              <button
                type="button"
                className="min-h-12"
                style={controlStyle}
                onClick={() => void exitDemo()}
                disabled={status === "loading" || status === "error"}
              >
                Exit demonstration
              </button>
            ) : null}
          </>
        ) : (
          <button type="button" className="min-h-12" style={controlStyle} onClick={() => void togglePause()} disabled={status === "loading" || status === "error" || controlsHidden}>
            {status === "paused" ? "Resume game" : "Pause game"}
          </button>
        )}
        <button type="button" className="min-h-12" style={controlStyle} onClick={toggleMute} disabled={status === "loading" || status === "error" || controlsHidden}>
          {muted ? "Unmute game" : "Mute game"}
        </button>
        {!demoActive && !(launchPhase === "demo" && briefingStarted) ? (
          <button type="button" className="min-h-12" style={controlStyle} onClick={() => void restart()} disabled={status === "loading"}>
            Restart game
          </button>
        ) : null}
        {!demoActive && onNavigate ? (
          <button type="button" className="min-h-12" style={controlStyle} onClick={() => void exitSession()} disabled={status === "loading" || status === "error" || controlsHidden}>
            Exit game
          </button>
        ) : null}
      </div> : null}
      {result && (
        <GameResultPanel
          outcome={resultOutcome === "complete" ? effectiveDebrief.outcome : resultOutcome}
          score={result.score}
          accuracy={result.accuracy}
          correctAnswers={result.correctAnswers}
          totalAttempts={result.totalAttempts}
          xp={result.xp}
          persistence={persistence}
          requiredCredit={effectiveDebrief.requiredCredit}
          onRetrySave={retryPersistence}
          onReplay={() => void restart()}
          onExit={() => void exitSession()}
        />
      )}
      {result && persistence.status === "confirmed" ? resultExtension : null}
      {children}
    </section>
  );
}
