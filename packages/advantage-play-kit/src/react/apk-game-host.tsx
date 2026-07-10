"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import type { GameResults } from "@reading-advantage/game-contracts";

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
export type APKGameHostProps = Omit<ComponentProps<"section">, "onComplete"> & {
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
  /** Accessible instructions displayed outside the canvas. */
  instructions?: ReactNode;
  /** Receives the validated cartridge display result. */
  onComplete?: (result: GameResults) => void | Promise<void>;
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
  instructions,
  onComplete,
  onDiagnostic,
  onNavigate,
  "aria-label": ariaLabel = "Language game",
  children,
  ...sectionProps
}: APKGameHostProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<APKGameHandle | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "paused" | "complete" | "error">(
    "loading",
  );
  const [muted, setMuted] = useState(false);
  const [result, setResult] = useState<GameResults>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const mountPoint = document.createElement("div");
    mountPoint.dataset.apkRuntimeMount = "true";
    surface.replaceChildren(mountPoint);
    let cancelled = false;
    let mountedHandle: APKGameHandle | undefined;
    setStatus("loading");
    setError(undefined);
    setResult(undefined);

    void mountCartridge(
      {
        container: mountPoint,
        cartridge,
        input,
        edition,
        host: {
          complete: async (nextResult) => {
            if (cancelled) return;
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
        if (cancelled) {
          return handle.destroy();
        }
        mountedHandle = handle;
        handleRef.current = handle;
        setStatus("ready");
      })
      .catch((mountError: unknown) => {
        if (cancelled) return;
        setError(mountError instanceof Error ? mountError.message : "Game failed to start");
        setStatus("error");
      });

    return () => {
      cancelled = true;
      handleRef.current = undefined;
      mountPoint.remove();
      void mountedHandle?.destroy();
    };
  }, [cartridge, edition, factory, input, onComplete, onDiagnostic, onNavigate, seed]);

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

  return (
    <section aria-label={ariaLabel} {...sectionProps}>
      <div aria-live="polite" aria-atomic="true">
        {status === "loading" && "Loading game..."}
        {status === "ready" && "Game ready"}
        {status === "paused" && "Game paused"}
        {status === "complete" && "Game complete"}
      </div>
      {instructions && <div>{instructions}</div>}
      {error && <div role="alert">Game could not start: {error}</div>}
      <div ref={surfaceRef} data-apk-canvas-host="true" aria-hidden="true" />
      <div role="group" aria-label="Game controls">
        <button type="button" onClick={togglePause} disabled={status === "loading" || status === "error"}>
          {status === "paused" ? "Resume game" : "Pause game"}
        </button>
        <button type="button" onClick={toggleMute} disabled={status === "loading" || status === "error"}>
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
