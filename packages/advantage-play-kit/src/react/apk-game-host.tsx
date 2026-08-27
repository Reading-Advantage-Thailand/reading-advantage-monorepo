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
import { GameResultPanel } from "../presentation/game-presentation.js";
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
  /** Accessible instructions displayed outside the canvas. */
  instructions?: ReactNode;
  /** Receives the validated cartridge display result and terminal outcome. */
  onComplete?: (result: GameResults, outcome: GameTerminalOutcome) => void | Promise<void>;
  /** Receives one validated transition emitted by the standard lifecycle host. */
  onLifecycleTransition?: (transition: GameLifecycleTransition) => void;
  /** Receives structured runtime and cartridge diagnostics. */
  onDiagnostic?: (event: APKDiagnosticEvent) => void;
  /** Receives host-relative navigation requests. */
  onNavigate?: (destination: string) => void;
  /** Optional first phase. Use `demo` to open a scored-session-free class demonstration. */
  launchPhase?: "briefing" | "demo";
};

const DEFAULT_DEBRIEF: StandardGameDebrief = Object.freeze({
  outcome: "complete",
  requiredCredit: STANDARD_GAME_REQUIRED_CREDIT,
  replayEntry: "briefing",
  exitDestination: "catalog",
});

const DEFAULT_DEMO_SEED = 1;

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
  instructions,
  onComplete,
  onLifecycleTransition,
  onDiagnostic,
  onNavigate,
  launchPhase = "briefing",
  "aria-label": ariaLabel = "Language game",
  children,
  ...sectionProps
}: APKGameHostProps) {
  const effectiveBriefing = standardExperience?.definition.briefing ?? briefing;
  const effectiveTutorial = standardExperience?.definition.tutorial ?? tutorial;
  const effectiveDebrief = standardExperience?.definition.debrief ?? DEFAULT_DEBRIEF;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<APKGameHandle | undefined>(undefined);
  const tutorialControllerRef = useRef<GameTutorialController | undefined>(undefined);
  const mountPointRef = useRef<HTMLDivElement | undefined>(undefined);
  const mountGenerationRef = useRef(0);
  const briefingStartGuardRef = useRef(false);
  const demoTeardownRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onLifecycleTransitionRef = useRef(onLifecycleTransition);
  const onDiagnosticRef = useRef(onDiagnostic);
  const onNavigateRef = useRef(onNavigate);
  const onTutorialSnapshotRef = useRef(onTutorialSnapshot);
  onCompleteRef.current = onComplete;
  onLifecycleTransitionRef.current = onLifecycleTransition;
  onDiagnosticRef.current = onDiagnostic;
  onNavigateRef.current = onNavigate;
  onTutorialSnapshotRef.current = onTutorialSnapshot;
  const [status, setStatus] = useState<
    "loading" | "briefing" | "tutorial" | "demo" | "countdown" | "ready" | "paused" | "complete" | "error"
  >("loading");
  const sessionModeRef = useRef<"playing" | "tutorial" | "demo">("playing");
  const [demoActive, setDemoActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [result, setResult] = useState<GameResults>();
  const [resultOutcome, setResultOutcome] = useState<GameTerminalOutcome>("complete");
  const [error, setError] = useState<string>();
  const [briefingStarted, setBriefingStarted] = useState(false);
  const [briefingRevision, setBriefingRevision] = useState(0);
  const [tutorialSnapshot, setTutorialSnapshot] = useState<GameTutorialControllerSnapshot>();

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
  const controlsHidden = (effectiveBriefing !== undefined
    && (!briefingStarted || status === "briefing" || status === "error"))
    || status === "complete";

  const destroyTutorialController = async (): Promise<void> => {
    const controller = tutorialControllerRef.current;
    tutorialControllerRef.current = undefined;
    await controller?.destroy();
  };

  const teardownDemo = async (failureMessage: string, endDemoState = true): Promise<boolean> => {
    if (demoTeardownRef.current) return false;
    demoTeardownRef.current = true;
    const activeHandle = handleRef.current;
    handleRef.current = undefined;
    mountGenerationRef.current += 1;
    setStatus("loading");
    try {
      await activeHandle?.destroy();
    } catch (teardownError) {
      handleRef.current = activeHandle;
      setError(teardownError instanceof Error ? teardownError.message : failureMessage);
      setStatus("error");
      demoTeardownRef.current = false;
      return false;
    }
    mountPointRef.current?.replaceChildren();
    if (endDemoState) {
      setDemoActive(false);
      sessionModeRef.current = "playing";
    }
    demoTeardownRef.current = false;
    return true;
  };

  const emitLifecycleTransition = (transition: GameLifecycleTransition): boolean => {
    try {
      onLifecycleTransitionRef.current?.(transition);
      return true;
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : "Game lifecycle signal failed");
      setStatus("error");
      return false;
    }
  };

  const mountGame = async (
    mountPoint: HTMLDivElement,
    generation: number,
    sessionMode: "playing" | "tutorial" | "demo" = "playing",
  ): Promise<APKGameHandle | undefined> => {
    sessionModeRef.current = sessionMode;
    const sessionSeed = sessionMode === "demo" && seed === undefined ? DEFAULT_DEMO_SEED : seed;
    try {
      const handle = await mountCartridge(
        {
          container: mountPoint,
          cartridge,
          input,
          edition,
          sessionMode,
          host: {
            complete: async (nextResult, outcome = "complete") => {
              if (generation !== mountGenerationRef.current || sessionMode !== "playing") return;
              handleRef.current?.pause();
              const transition = gameLifecycleTransitionSchema.parse({
                from: "playing",
                event: "game-complete",
                to: "results",
              });
              if (!emitLifecycleTransition(transition)) return;
              setResult(nextResult);
              setResultOutcome(outcome);
              setStatus("complete");
              try {
                await onCompleteRef.current?.(nextResult, outcome);
              } catch (completionError) {
                setError(completionError instanceof Error ? completionError.message : "Game result could not be saved");
              }
            },
            navigate: (destination) => onNavigateRef.current?.(destination),
            diagnostic: (event) => onDiagnosticRef.current?.(event),
          },
          ...(sessionSeed === undefined ? {} : { seed: sessionSeed }),
          ...(responsive === undefined ? {} : { responsive }),
        },
        factory ?? createPhaserGameFactory(),
      );
      if (generation !== mountGenerationRef.current) {
        await handle.destroy();
        return undefined;
      }
      handleRef.current = handle;
      setDemoActive(sessionMode === "demo");
      setStatus(
        sessionMode === "tutorial" ? "tutorial" : sessionMode === "demo" ? "demo" : "ready",
      );
      return handle;
    } catch (mountError: unknown) {
      if (generation !== mountGenerationRef.current) return undefined;
      await destroyTutorialController();
      mountPoint.replaceChildren();
      if (sessionMode === "demo") {
        setDemoActive(false);
        sessionModeRef.current = "playing";
      }
      setError(mountError instanceof Error ? mountError.message : "Game failed to start");
      setStatus("error");
      return undefined;
    }
  };

  const enterPlayingFromTutorial = async (
    mountPoint: HTMLDivElement,
    generation: number,
    transition: GameLifecycleTransition,
  ): Promise<void> => {
    if (generation !== mountGenerationRef.current) return;
    if (!emitLifecycleTransition(transition)) return;
    if (transition.to !== "playing" && transition.to !== "countdown") return;

    if (transition.to === "countdown") {
      setStatus("countdown");
      const countdownTransition = gameLifecycleTransitionSchema.parse({
        from: "countdown",
        event: "countdown-complete",
        to: "playing",
      });
      if (!emitLifecycleTransition(countdownTransition)) return;
    }

    setStatus("loading");
    const previewHandle = handleRef.current;
    handleRef.current = undefined;
    await destroyTutorialController();
    await previewHandle?.destroy();
    if (generation !== mountGenerationRef.current) return;
    mountPoint.replaceChildren();
    setTutorialSnapshot(undefined);
    await mountGame(mountPoint, generation, "playing");
  };

  const startTutorial = async (mountPoint: HTMLDivElement, generation: number): Promise<void> => {
    const actionDriver = standardExperience?.createTutorialActionDriver() ?? tutorialActionDriver;
    if (effectiveTutorial === undefined || actionDriver === undefined) {
      setError("The tutorial phase is not available in this host yet. The cartridge remains gated until its phase controller is available.");
      setStatus("error");
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
    const controller = createGameTutorialController({
      tutorial: effectiveTutorial,
      actionDriver,
      clock: tutorialClock ?? createBrowserTutorialClock(),
      effects,
      onLifecycleTransition: (transition) => {
        void enterPlayingFromTutorial(mountPoint, generation, transition);
      },
      onDiagnostic: undefined,
      onSnapshot: (snapshot) => {
        if (generation !== mountGenerationRef.current) return;
        setTutorialSnapshot(snapshot);
        onTutorialSnapshotRef.current?.({
          ...snapshot,
          ...(snapshot.currentTarget === undefined ? {} : { currentTarget: { id: snapshot.currentTarget.id } }),
        } as GameTutorialControllerSnapshot);
      },
    });
    tutorialControllerRef.current = controller;
    const mounted = await mountGame(mountPoint, generation, "tutorial");
    if (!mounted || generation !== mountGenerationRef.current) return;
    await controller.start();
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
    return mountGame(mountPoint, mountGenerationRef.current, "demo");
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
    const mounted = await mountDemoSession();
    if (!mounted) {
      briefingStartGuardRef.current = false;
      setBriefingStarted(false);
      return;
    }
    if (!emitLifecycleTransition(transitionResult.data)) {
      await teardownDemo("The class demonstration could not start.");
      briefingStartGuardRef.current = false;
      setBriefingStarted(false);
      setStatus("error");
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
    const transition = gameLifecycleTransitionSchema.parse({
      from: "demo",
      event: "demo-complete",
      to: "briefing",
    });
    if (!emitLifecycleTransition(transition)) return;
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
    if (navigate === undefined) return;
    try {
      navigate(effectiveDebrief.exitDestination);
    } catch (navigationError) {
      setError(navigationError instanceof Error ? navigationError.message : "Game navigation failed");
      setStatus("error");
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
    if (!await teardownDemo("The class demonstration could not be skipped.")) return;
    const demoToCountdown = gameLifecycleTransitionSchema.parse({
      from: "demo",
      event: "demo-complete",
      to: "countdown",
    });
    if (!emitLifecycleTransition(demoToCountdown)) return;
    setStatus("countdown");
    const generation = mountGenerationRef.current;
    setTutorialSnapshot(undefined);
    setBriefingStarted(true);
    setStatus("loading");
    const mounted = await mountGame(mountPoint, generation, "playing");
    if (!mounted) return;
    const countdownToPlaying = gameLifecycleTransitionSchema.parse({
      from: "countdown",
      event: "countdown-complete",
      to: "playing",
    });
    if (!emitLifecycleTransition(countdownToPlaying)) return;
  };

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const mountPoint = document.createElement("div");
    mountPoint.dataset.apkRuntimeMount = "true";
    mountPoint.style.width = "100%";
    mountPoint.style.height = "100%";
    surface.replaceChildren(mountPoint);
    mountPointRef.current = mountPoint;
    const generation = mountGenerationRef.current + 1;
    mountGenerationRef.current = generation;
    briefingStartGuardRef.current = false;
    setBriefingStarted(false);
    setBriefingRevision((revision) => revision + 1);
    setDemoActive(false);
    setError(undefined);
    setResult(undefined);
    setResultOutcome("complete");

    if (launchPhase === "demo") {
      setBriefingStarted(true);
      setStatus("loading");
      void mountGame(mountPoint, generation, "demo");
    } else if (effectiveBriefing !== undefined) {
      if (validationError) {
        setStatus("error");
      } else {
        setStatus("briefing");
      }
    } else {
      setStatus("loading");
      void mountGame(mountPoint, generation, "playing");
    }

    return () => {
      mountGenerationRef.current += 1;
      const mountedHandle = handleRef.current;
      handleRef.current = undefined;
      void destroyTutorialController();
      mountPointRef.current = undefined;
      mountPoint.remove();
      void mountedHandle?.destroy();
    };
    // The mount branch intentionally preserves the legacy immediate-launch behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartridge, edition, factory, input, responsive, seed, effectiveBriefing, validationError, launchPhase]);

  const startBriefing = async (): Promise<void> => {
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

    const resolvedStartPhase = resolveGameBriefingStartPhase(effectiveBriefing);
    const transitionResult = gameLifecycleTransitionSchema.safeParse({
      from: "briefing",
      event: "start",
      to: resolvedStartPhase,
    });
    if (!transitionResult.success) {
      setError("The briefing could not continue because its lifecycle transition is invalid.");
      setStatus("error");
      return;
    }

    if (resolvedStartPhase === "demo") {
      const mounted = await mountDemoSession();
      if (!mounted) {
        briefingStartGuardRef.current = false;
        setBriefingStarted(false);
        return;
      }
      if (!emitLifecycleTransition(transitionResult.data)) {
        await teardownDemo("The class demonstration could not start.");
        briefingStartGuardRef.current = false;
        setBriefingStarted(false);
        setStatus("error");
      }
      return;
    }

    if (!emitLifecycleTransition(transitionResult.data)) return;
    if (resolvedStartPhase === "tutorial") {
      const mountPoint = mountPointRef.current;
      if (!mountPoint) {
        setError("The game surface is not ready. Try again.");
        setStatus("error");
        return;
      }
      setResult(undefined);
      setResultOutcome("complete");
      setStatus("loading");
      void startTutorial(mountPoint, mountGenerationRef.current);
      return;
    }
    if (resolvedStartPhase !== "playing") {
      setError(
        `The ${resolvedStartPhase} phase is not available in this host yet. The cartridge remains gated until its phase controller is available.`,
      );
      setStatus("error");
      return;
    }

    const mountPoint = mountPointRef.current;
    if (!mountPoint) {
      setError("The game surface is not ready. Try again.");
      setStatus("error");
      return;
    }

    setResult(undefined);
    setResultOutcome("complete");
    setStatus("loading");
    const generation = mountGenerationRef.current;
    void mountGame(mountPoint, generation, "playing");
  };

  const togglePause = () => {
    if (status === "paused") {
      handleRef.current?.resume();
      setStatus(sessionModeRef.current === "demo" ? "demo" : "ready");
    } else {
      handleRef.current?.pause();
      setStatus("paused");
    }
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    handleRef.current?.setMuted(nextMuted);
    setMuted(nextMuted);
  };

  const restart = async () => {
    if (demoActive) {
      await restartDemo();
      return;
    }
    if (effectiveBriefing !== undefined) {
      const activeHandle = handleRef.current;
      const replayEntry = result ? effectiveDebrief.replayEntry : "briefing";
      if (result) {
        const transition = gameLifecycleTransitionSchema.parse({
          from: "results",
          event: "replay",
          to: replayEntry,
        });
        if (!emitLifecycleTransition(transition)) return;
      }
      briefingStartGuardRef.current = true;
      setBriefingStarted(true);
      setError(undefined);
      setResult(undefined);
      setResultOutcome("complete");
      setStatus("loading");
      mountGenerationRef.current += 1;
      await destroyTutorialController();
      handleRef.current = undefined;
      mountPointRef.current?.replaceChildren();

      try {
        await activeHandle?.destroy();
      } catch (restartError) {
        setError(restartError instanceof Error ? restartError.message : "Game failed to restart");
        setStatus("error");
        return;
      }

      const mountPoint = mountPointRef.current;
      if (!mountPoint) {
        setError("The game surface is not ready. Try again.");
        setStatus("error");
        return;
      }
      if (replayEntry === "tutorial") {
        setBriefingStarted(true);
        await startTutorial(mountPoint, mountGenerationRef.current);
        return;
      }
      if (replayEntry === "playing") {
        setBriefingStarted(true);
        await mountGame(mountPoint, mountGenerationRef.current, "playing");
        return;
      }

      briefingStartGuardRef.current = false;
      setBriefingStarted(false);
      setBriefingRevision((revision) => revision + 1);
      setStatus("briefing");
      return;
    }

    setError(undefined);
    setResult(undefined);
    setResultOutcome("complete");
    setStatus("loading");
    try {
      await handleRef.current?.restart();
      setStatus("ready");
    } catch (restartError) {
      setError(restartError instanceof Error ? restartError.message : "Game failed to restart");
      setStatus("error");
    }
  };

  const replayTutorial = async (): Promise<void> => {
    const mountPoint = mountPointRef.current;
    if (!mountPoint) return;
    const activeHandle = handleRef.current;
    handleRef.current = undefined;
    mountGenerationRef.current += 1;
    const generation = mountGenerationRef.current;
    setStatus("loading");
    setTutorialSnapshot(undefined);
    await destroyTutorialController();
    await activeHandle?.destroy();
    mountPoint.replaceChildren();
    await startTutorial(mountPoint, generation);
  };

  const runTutorialCommand = (command: "pause" | "resume" | "advance" | "replay" | "skip") => {
    const controller = tutorialControllerRef.current;
    if (controller === undefined) return;
    if (command === "replay") {
      void replayTutorial();
      return;
    }
    void controller[command]();
  };

  return (
    <section aria-label={ariaLabel} {...sectionProps}>
      <div aria-live="polite" aria-atomic="true">
        {status === "loading" && "Loading game..."}
        {status === "briefing" && "Game briefing ready"}
        {status === "tutorial" && "Guided tutorial ready"}
        {status === "demo" && "Class demonstration ready"}
        {status === "countdown" && "Game starting"}
        {status === "ready" && "Game ready"}
        {status === "paused" && "Game paused"}
        {status === "complete" && "Game complete"}
      </div>
      {instructions && <div>{instructions}</div>}
      {(validationError ?? error) && (
        <div role="alert">
          Game could not start: {validationError ?? error}
          {effectiveBriefing !== undefined && briefingStarted && error ? (
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
          onStart={startBriefing}
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
        && tutorialControllerRef.current ? (
          <GameTutorialScreen
            tutorial={effectiveTutorial}
            snapshot={tutorialSnapshot}
            controller={tutorialControllerRef.current}
            targetLabel={tutorialSnapshot.currentStep?.title}
            actionLabel={tutorialSnapshot.currentAction?.id}
            consequenceFeedback={tutorialSnapshot.currentStep?.explanation}
            layoutProfile={layoutProfile}
            showControls={false}
          />
        ) : null}
      <div
        ref={surfaceRef}
        data-apk-canvas-host="true"
        aria-hidden="true"
        hidden={status === "complete"}
      />
      <div
        role="group"
        aria-label="Game controls"
        data-apk-game-controls="true"
        hidden={controlsHidden}
      >
        {tutorialSnapshot?.phase === "tutorial" ? (
          <>
            <button type="button" onClick={() => runTutorialCommand(tutorialSnapshot.status === "paused" ? "resume" : "pause")}>
              {tutorialSnapshot.status === "paused" ? effectiveTutorial?.labels.resume : effectiveTutorial?.labels.pause}
            </button>
            <button type="button" onClick={() => runTutorialCommand("advance")}>{effectiveTutorial?.labels.advance}</button>
            <button type="button" onClick={() => runTutorialCommand("replay")}>{effectiveTutorial?.labels.replay}</button>
            <button type="button" onClick={() => runTutorialCommand("skip")}>{effectiveTutorial?.labels.skip}</button>
          </>
        ) : demoActive ? (
          <>
            <button type="button" className="min-h-11" onClick={togglePause} disabled={status === "loading" || status === "error"}>
              {status === "paused" ? "Resume demonstration" : "Pause demonstration"}
            </button>
            <button type="button" className="min-h-11" onClick={() => void restartDemo()} disabled={status === "loading" || status === "error"}>
              Restart demonstration
            </button>
            <button type="button" className="min-h-11" onClick={() => void endDemo()} disabled={status === "loading" || status === "error"}>
              End demonstration
            </button>
            <button type="button" className="min-h-11" onClick={() => void skipDemo()} disabled={status === "loading" || status === "error"}>
              Skip demonstration
            </button>
            {onNavigate ? (
              <button
                type="button"
                className="min-h-11"
                onClick={() => void exitDemo()}
                disabled={status === "loading" || status === "error"}
              >
                Exit demonstration
              </button>
            ) : null}
          </>
        ) : (
          <button type="button" onClick={togglePause} disabled={status === "loading" || status === "error" || controlsHidden}>
            {status === "paused" ? "Resume game" : "Pause game"}
          </button>
        )}
        <button type="button" onClick={toggleMute} disabled={status === "loading" || status === "error" || controlsHidden}>
          {muted ? "Unmute game" : "Mute game"}
        </button>
        {!demoActive && !(launchPhase === "demo" && briefingStarted) ? (
          <button type="button" onClick={() => void restart()} disabled={status === "loading"}>
            Restart game
          </button>
        ) : null}
      </div>
      {result && (
        <GameResultPanel
          outcome={resultOutcome === "complete" ? effectiveDebrief.outcome : resultOutcome}
          score={result.score}
          accuracy={result.accuracy}
          correctAnswers={result.correctAnswers}
          totalAttempts={result.totalAttempts}
          xp={result.xp}
          requiredCredit={effectiveDebrief.requiredCredit}
          onReplay={() => void restart()}
          onExit={() => onNavigateRef.current?.(effectiveDebrief.exitDestination)}
        />
      )}
      {children}
    </section>
  );
}
