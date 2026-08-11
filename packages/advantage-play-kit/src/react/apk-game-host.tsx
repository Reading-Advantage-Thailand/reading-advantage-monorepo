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
  /** Optional validated mission briefing shown before normal gameplay. */
  briefing?: GameBriefing;
  /** Optional validated tutorial that runs through the cartridge mechanic. */
  tutorial?: GameTutorialDefinition;
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
  /** Receives the validated cartridge display result. */
  onComplete?: (result: GameResults) => void | Promise<void>;
  /** Receives one validated transition emitted by the standard lifecycle host. */
  onLifecycleTransition?: (transition: GameLifecycleTransition) => void;
  /** Receives structured runtime and cartridge diagnostics. */
  onDiagnostic?: (event: APKDiagnosticEvent) => void;
  /** Receives host-relative navigation requests. */
  onNavigate?: (destination: string) => void;
};

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
  briefing,
  tutorial,
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
  "aria-label": ariaLabel = "Language game",
  children,
  ...sectionProps
}: APKGameHostProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<APKGameHandle | undefined>(undefined);
  const tutorialControllerRef = useRef<GameTutorialController | undefined>(undefined);
  const mountPointRef = useRef<HTMLDivElement | undefined>(undefined);
  const mountGenerationRef = useRef(0);
  const briefingStartGuardRef = useRef(false);
  const [status, setStatus] = useState<
    "loading" | "briefing" | "ready" | "paused" | "complete" | "error"
  >("loading");
  const [muted, setMuted] = useState(false);
  const [result, setResult] = useState<GameResults>();
  const [error, setError] = useState<string>();
  const [briefingStarted, setBriefingStarted] = useState(false);
  const [briefingRevision, setBriefingRevision] = useState(0);
  const [tutorialSnapshot, setTutorialSnapshot] = useState<GameTutorialControllerSnapshot>();

  const briefingValidation = briefing === undefined
    ? undefined
    : gameBriefingSchema.safeParse(briefing);
  const inputValidation = briefing === undefined
    ? undefined
    : (cartridge.manifest.inputMode === "sentence" ? sentenceInputSchema : vocabularyInputSchema)
      .safeParse(input);
  const validationError = briefingValidation && !briefingValidation.success
    ? "Briefing validation failed. Check the title, objective, instructions, learning preview, and controls."
    : inputValidation && !inputValidation.success
      ? "Learning input validation failed. Check every term and translation before starting the game."
      : undefined;
  const briefingVisible = briefing !== undefined
    && briefingValidation?.success === true
    && inputValidation?.success === true
    && !briefingStarted;
  const controlsHidden = briefing !== undefined
    && (!briefingStarted || status === "briefing" || status === "error");

  const mountGame = (mountPoint: HTMLDivElement, generation: number): void => {
    void mountCartridge(
      {
        container: mountPoint,
        cartridge,
        input,
        edition,
        host: {
          complete: async (nextResult) => {
            if (generation !== mountGenerationRef.current) return;
            setResult(nextResult);
            setStatus("complete");
            await onComplete?.(nextResult);
          },
          navigate: onNavigate,
          diagnostic: onDiagnostic,
        },
        ...(seed === undefined ? {} : { seed }),
      },
      factory ?? createPhaserGameFactory(),
    )
      .then((handle) => {
        if (generation !== mountGenerationRef.current) {
          return handle.destroy();
        }
        handleRef.current = handle;
        setStatus("ready");
      })
      .catch((mountError: unknown) => {
        if (generation !== mountGenerationRef.current) return;
        destroyTutorialController();
        mountPoint.replaceChildren();
        setError(mountError instanceof Error ? mountError.message : "Game failed to start");
        setStatus("error");
      });
  };

  const destroyTutorialController = (): void => {
    const controller = tutorialControllerRef.current;
    tutorialControllerRef.current = undefined;
    void controller?.destroy();
  };

  const startTutorial = (mountPoint: HTMLDivElement, generation: number): void => {
    if (tutorial === undefined || tutorialActionDriver === undefined || tutorialClock === undefined) {
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
      tutorial,
      actionDriver: tutorialActionDriver,
      clock: tutorialClock,
      effects,
      onLifecycleTransition: onLifecycleTransition ?? (() => undefined),
      onDiagnostic: undefined,
      onSnapshot: (snapshot) => {
        if (generation !== mountGenerationRef.current) return;
        setTutorialSnapshot(snapshot);
        onTutorialSnapshot?.({
          ...snapshot,
          ...(snapshot.currentTarget === undefined ? {} : { currentTarget: { id: snapshot.currentTarget.id } }),
        } as GameTutorialControllerSnapshot);
      },
    });
    tutorialControllerRef.current = controller;
    void controller.start();
    mountGame(mountPoint, generation);
  };

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const mountPoint = document.createElement("div");
    mountPoint.dataset.apkRuntimeMount = "true";
    surface.replaceChildren(mountPoint);
    mountPointRef.current = mountPoint;
    const generation = mountGenerationRef.current + 1;
    mountGenerationRef.current = generation;
    briefingStartGuardRef.current = false;
    setBriefingStarted(false);
    setBriefingRevision((revision) => revision + 1);
    setError(undefined);
    setResult(undefined);

    if (briefing !== undefined) {
      if (validationError) {
        setStatus("error");
      } else {
        setStatus("briefing");
      }
    } else {
      setStatus("loading");
      mountGame(mountPoint, generation);
    }

    return () => {
      mountGenerationRef.current += 1;
      const mountedHandle = handleRef.current;
      handleRef.current = undefined;
      destroyTutorialController();
      mountPointRef.current = undefined;
      mountPoint.remove();
      void mountedHandle?.destroy();
    };
    // The mount branch intentionally preserves the legacy immediate-launch behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartridge, edition, factory, input, onComplete, onDiagnostic, onNavigate, seed, briefing, validationError]);

  const startBriefing = () => {
    if (
      briefingStartGuardRef.current
      || briefing === undefined
      || !briefingValidation?.success
      || !inputValidation?.success
    ) {
      return;
    }

    briefingStartGuardRef.current = true;
    setBriefingStarted(true);
    setError(undefined);

    const resolvedStartPhase = resolveGameBriefingStartPhase(briefing);
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

    try {
      onLifecycleTransition?.(transitionResult.data);
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : "Game start signal failed");
      setStatus("error");
      return;
    }
    if (resolvedStartPhase === "tutorial") {
      const mountPoint = mountPointRef.current;
      if (!mountPoint) {
        setError("The game surface is not ready. Try again.");
        setStatus("error");
        return;
      }
      setResult(undefined);
      setStatus("loading");
      startTutorial(mountPoint, mountGenerationRef.current);
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
    setStatus("loading");
    const generation = mountGenerationRef.current;
    mountGame(mountPoint, generation);
  };

  const togglePause = () => {
    if (status === "paused") {
      handleRef.current?.resume();
      setStatus("ready");
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
    if (briefing !== undefined) {
      const activeHandle = handleRef.current;
      briefingStartGuardRef.current = true;
      setBriefingStarted(true);
      setError(undefined);
      setResult(undefined);
      setStatus("loading");
      mountGenerationRef.current += 1;
      destroyTutorialController();
      handleRef.current = undefined;
      mountPointRef.current?.replaceChildren();

      try {
        await activeHandle?.destroy();
      } catch (restartError) {
        setError(restartError instanceof Error ? restartError.message : "Game failed to restart");
        setStatus("error");
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
    setStatus("loading");
    try {
      await handleRef.current?.restart();
      setStatus("ready");
    } catch (restartError) {
      setError(restartError instanceof Error ? restartError.message : "Game failed to restart");
      setStatus("error");
    }
  };

  const runTutorialCommand = (command: "pause" | "resume" | "advance" | "replay" | "skip") => {
    const controller = tutorialControllerRef.current;
    if (controller === undefined) return;
    if (command === "replay") {
      void Promise.resolve(controller.replay()).then(() => controller.start());
      return;
    }
    void controller[command]();
  };

  return (
    <section aria-label={ariaLabel} {...sectionProps}>
      <div aria-live="polite" aria-atomic="true">
        {status === "loading" && "Loading game..."}
        {status === "briefing" && "Game briefing ready"}
        {status === "ready" && "Game ready"}
        {status === "paused" && "Game paused"}
        {status === "complete" && "Game complete"}
      </div>
      {instructions && <div>{instructions}</div>}
      {(validationError ?? error) && (
        <div role="alert">
          Game could not start: {validationError ?? error}
          {briefing !== undefined && briefingStarted && error ? (
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
          layoutProfile={layoutProfile}
          inputMode={inputMode}
          startPending={briefingStartGuardRef.current}
          extension={briefingExtension}
        />
      ) : null}
      <div ref={surfaceRef} data-apk-canvas-host="true" aria-hidden="true" />
      <div
        role="group"
        aria-label="Game controls"
        hidden={controlsHidden}
      >
        {tutorialSnapshot?.phase === "tutorial" ? (
          <>
            <button type="button" onClick={() => runTutorialCommand(tutorialSnapshot.status === "paused" ? "resume" : "pause")}>
              {tutorialSnapshot.status === "paused" ? tutorial?.labels.resume : tutorial?.labels.pause}
            </button>
            <button type="button" onClick={() => runTutorialCommand("advance")}>{tutorial?.labels.advance}</button>
            <button type="button" onClick={() => runTutorialCommand("replay")}>{tutorial?.labels.replay}</button>
            <button type="button" onClick={() => runTutorialCommand("skip")}>{tutorial?.labels.skip}</button>
          </>
        ) : (
          <button type="button" onClick={togglePause} disabled={status === "loading" || status === "error" || controlsHidden}>
            {status === "paused" ? "Resume game" : "Pause game"}
          </button>
        )}
        <button type="button" onClick={toggleMute} disabled={status === "loading" || status === "error" || controlsHidden}>
          {muted ? "Unmute game" : "Mute game"}
        </button>
        <button type="button" onClick={() => void restart()} disabled={status === "loading"}>
          Restart game
        </button>
      </div>
      {result && (
        <div aria-label="Game result">
          <p>Score: {result.score}</p>
          <p>Accuracy: {Math.round(result.accuracy * 100)}%</p>
          <p>XP: {result.xp}</p>
        </div>
      )}
      {children}
    </section>
  );
}
