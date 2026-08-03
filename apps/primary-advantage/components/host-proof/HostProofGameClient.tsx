"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG } from "@reading-advantage/advantage-play-kit/responsive";
import { APKGameHost } from "@reading-advantage/advantage-play-kit/react";
import type {
  APKDiagnosticEvent,
  ResponsiveRuntimeOptions,
  RuntimeCartridge,
  RuntimeEdition,
} from "@reading-advantage/advantage-play-kit/runtime";
import { vocabularyInputSchema, type VocabularyInput } from "@reading-advantage/game-contracts";
import { z } from "zod";

type CompletionStatus = "starting" | "ready" | "submitting" | "completed" | "error";

/** One server-issued, actor-bound launch contract supplied to the runtime. */
interface IssuedDragonFlightAttempt {
  /** Server-created immutable attempt identifier. */
  readonly attemptId: string;
  /** Opaque credential that binds the attempt to the authenticated actor. */
  readonly credential: string;
  /** Server-owned vocabulary passed to the real cartridge. */
  readonly input: VocabularyInput;
  /** ISO timestamp at which the credential expires. */
  readonly expiresAt: string;
}

/** One safe server-derived completion outcome rendered by the host. */
interface DragonFlightCompletion {
  /** XP awarded by the authoritative persistence boundary. */
  readonly xpEarned: number;
  /** Server-replayed title score. */
  readonly score: number;
  /** Server-replayed title accuracy. */
  readonly accuracy: number;
  /** Whether the server-replayed launch completed the title successfully. */
  readonly victory: boolean;
  /** Whether the result was a durable replay. */
  readonly duplicate: boolean;
}

/** A validated history row displayed only for the authenticated Dragon Flight actor. */
interface DragonFlightHistoryEntry {
  /** Unique persisted completion identifier. */
  readonly id: string;
  /** Server-validated title identifier. */
  readonly gameType: "dragon-flight" | "magic-defense" | "dungeon-liberator" | "castle-defense" | "wizard-vs-zombie" | "village-guardian" | "enchanted-library" | "rune-match" | "alchemists-synthesis" | "potion-rush" | "rune-forge-chamber" | "spellweavers-run" | "shadow-gate-dungeon" | "labyrinth-goblin-king" | "griffin-riders-escape";
  /** Canonical server-selected difficulty. */
  readonly difficulty: "easy" | "medium" | "hard" | "extreme";
  /** Server-replayed score. */
  readonly score: number;
  /** Server-replayed accuracy. */
  readonly accuracy: number;
  /** Persisted XP award. */
  readonly xpEarned: number;
  /** Server activity identifier linked to this persisted completion. */
  readonly activityId: string;
  /** ISO completion time. */
  readonly createdAt: string;
}

/** A title-owned runtime action captured from a structured cartridge diagnostic. */
type DragonFlightAction =
  | { readonly sequence: number; readonly kind: "choose-gate"; readonly gate: "left" | "right"; readonly elapsedMs: number }
  | { readonly sequence: number; readonly kind: "launch"; readonly elapsedMs: number };

/** One opaque server receipt for a single ordered Dragon Flight action. */
interface DragonFlightActionCheckpoint {
  /** Server-issued action-specific protocol receipt. */
  readonly checkpoint: string;
  /** Server-owned minimum wait before a launch action can follow this receipt. */
  readonly minimumNextActionDwellMs: number;
}

/** A locally timed server receipt retained until the full completion request is submitted. */
interface QueuedDragonFlightActionCheckpoint extends DragonFlightActionCheckpoint {
  /** Browser time when the host received the signed server receipt. */
  readonly receivedAtMs: number;
}

/** Mutable UI state for a bounded real-cartridge host session. */
interface HostProofState {
  /** Current server-issued attempt, if launch has completed. */
  readonly attempt: IssuedDragonFlightAttempt | null;
  /** Explicit, non-root Dragon Flight runtime cartridge. */
  readonly cartridge: RuntimeCartridge | null;
  /** Current launch or completion state. */
  readonly status: CompletionStatus;
  /** Safe host-facing status message. */
  readonly message: string;
  /** Latest authoritative completion outcome. */
  readonly completion: DragonFlightCompletion | null;
  /** Authenticated actor history. */
  readonly history: readonly DragonFlightHistoryEntry[];
}

const issuedAttemptSchema = z.object({
  attemptId: z.string().uuid(),
  credential: z.string().min(1),
  input: vocabularyInputSchema,
  expiresAt: z.string().datetime(),
}).strict();

const actionCheckpointSchema = z.object({
  checkpoint: z.string().min(1),
  minimumNextActionDwellMs: z.number().int().min(0).max(60_000),
}).strict();

// This client-only buffer starts after the receipt arrives; the server remains authoritative.
const HOST_PROOF_ACTION_DWELL_SAFETY_MARGIN_MS = 50;

const completionSchema = z.object({
  xpEarned: z.number().int().min(0),
  score: z.number().int().min(0),
  accuracy: z.number().min(0).max(1),
  correctAnswers: z.number().int().min(0),
  totalAttempts: z.number().int().min(1),
  duration: z.number().int().min(0),
  victory: z.boolean(),
  duplicate: z.boolean(),
}).strict();

const historyEntrySchema = z.object({
  id: z.string().min(1),
  gameType: z.enum(["dragon-flight", "magic-defense", "dungeon-liberator", "castle-defense", "wizard-vs-zombie", "village-guardian", "enchanted-library", "rune-match", "alchemists-synthesis", "potion-rush", "rune-forge-chamber", "spellweavers-run", "shadow-gate-dungeon", "labyrinth-goblin-king", "griffin-riders-escape"]),
  difficulty: z.enum(["easy", "medium", "hard", "extreme"]),
  score: z.number().int().min(0),
  accuracy: z.number().min(0).max(1),
  xpEarned: z.number().int().min(0),
  activityId: z.string().min(1),
  createdAt: z.string().min(1),
}).strict();

const historyResponseSchema = z.object({ history: z.array(historyEntrySchema) }).strict();

const HOST_PROOF_RESPONSIVE_OPTIONS: ResponsiveRuntimeOptions = Object.freeze({
  config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  inputCapabilities: { touch: true, pointer: true, keyboard: true },
  accessibility: { textScale: 1, touchScale: 1 },
});

const INITIAL_STATE: HostProofState = Object.freeze({
  attempt: null,
  cartridge: null,
  status: "starting",
  message: "Preparing your Dragon Flight session…",
  completion: null,
  history: [],
});

/**
 * Reads a JSON API response and exposes only the service's safe error message.
 * @param response Fetch response from one authenticated host-proof endpoint.
 * @returns The JSON payload when the request succeeded.
 * @throws When the endpoint reports a non-success response.
 */
async function readApiResponse(response: Response): Promise<unknown> {
  const payload: unknown = await response.json().catch(() => undefined);
  if (response.ok) return payload;
  const message = payload
    && typeof payload === "object"
    && "error" in payload
    && payload.error
    && typeof payload.error === "object"
    && "message" in payload.error
    && typeof payload.error.message === "string"
    ? payload.error.message
    : `Request failed with status ${response.status}`;
  throw new Error(message);
}

/**
 * Returns whether a diagnostic code is a title-owned host-proof action event.
 * Cartridges emit title-specific codes such as DRAGON_FLIGHT_HOST_PROOF_ACTION,
 * MAGIC_DEFENSE_HOST_PROOF_ACTION, CASTLE_DEFENSE_HOST_PROOF_ACTION, etc.
 * @param code Diagnostic event code from the runtime.
 * @returns True when the code is a host-proof action diagnostic for any cutover title.
 */
function isHostProofActionDiagnosticCode(code: string): boolean {
  return code.endsWith("_HOST_PROOF_ACTION");
}

/**
 * Extracts a verified action from the real cartridge's structured diagnostic event.
 * Accepts any title-specific `*_HOST_PROOF_ACTION` code so multi-title cutover
 * clients enqueue choose-gate/launch checkpoints for non-dragon-flight titles.
 * @param event Runtime diagnostic emitted by a host-proof cartridge.
 * @param nextSequence Sequence assigned by this host session.
 * @returns A safe action transcript record, or undefined for unrelated diagnostics.
 */
function actionFromDiagnostic(
  event: APKDiagnosticEvent,
  nextSequence: number,
): DragonFlightAction | undefined {
  if (!isHostProofActionDiagnosticCode(event.code) || !event.details) return undefined;
  const { kind, gate, elapsedMs } = event.details;
  if (typeof elapsedMs !== "number" || !Number.isInteger(elapsedMs) || elapsedMs < 0) return undefined;
  if (kind === "choose-gate" && (gate === "left" || gate === "right")) {
    return { sequence: nextSequence, kind, gate, elapsedMs };
  }
  if (kind === "launch") return { sequence: nextSequence, kind, elapsedMs };
  return undefined;
}

/**
 * Renders the authenticated Dragon Flight proof host for Primary Advantage.
 * @param props The server-selected standard-pack edition.
 * @returns A real APK runtime surface and only server-derived completion state.
 */

async function loadHostProofCartridgeForGameType(
  cartridgeModule: typeof import("@reading-advantage/game-cartridges/host-proof") & {
    loadLegacyDefenseHostProofCartridge?: (id: string) => Promise<RuntimeCartridge>;
  },
  gameType: "dragon-flight" | "magic-defense" | "dungeon-liberator" | "castle-defense" | "wizard-vs-zombie" | "village-guardian" | "enchanted-library" | "rune-match" | "alchemists-synthesis" | "potion-rush" | "rune-forge-chamber" | "spellweavers-run" | "shadow-gate-dungeon" | "labyrinth-goblin-king" | "griffin-riders-escape",
): Promise<RuntimeCartridge> {
  if (gameType === "dragon-flight") return cartridgeModule.loadDragonFlightHostProofCartridge();
  if (gameType === "magic-defense") return cartridgeModule.loadMagicDefenseHostProofCartridge();
  if (gameType === "dungeon-liberator") return cartridgeModule.loadDungeonLiberatorHostProofCartridge();
  if (gameType === "castle-defense" || gameType === "wizard-vs-zombie" || gameType === "village-guardian") {
    const defense = await import("@reading-advantage/game-cartridges/legacy-defense-host-proof");
    return defense.loadLegacyDefenseHostProofCartridge(gameType);
  }
  if (
    gameType === "enchanted-library"
    || gameType === "rune-match"
    || gameType === "alchemists-synthesis"
    || gameType === "potion-rush"
    || gameType === "rune-forge-chamber"
  ) {
    const puzzle = await import("@reading-advantage/game-cartridges/legacy-puzzle-host-proof");
    return puzzle.loadLegacyPuzzleHostProofCartridge(gameType);
  }
  if (
    gameType === "spellweavers-run"
    || gameType === "shadow-gate-dungeon"
    || gameType === "labyrinth-goblin-king"
    || gameType === "griffin-riders-escape"
  ) {
    const traversal = await import("@reading-advantage/game-cartridges/legacy-traversal-host-proof");
    return traversal.loadLegacyTraversalHostProofCartridge(gameType);
  }
  throw new Error(`Unsupported host-proof gameType: ${gameType}`);
}

export function HostProofGameClient({
  edition,
  gameType = "dragon-flight",
}: {
  readonly edition: RuntimeEdition;
  readonly gameType?: "dragon-flight" | "magic-defense" | "dungeon-liberator" | "castle-defense" | "wizard-vs-zombie" | "village-guardian" | "enchanted-library" | "rune-match" | "alchemists-synthesis" | "potion-rush" | "rune-forge-chamber" | "spellweavers-run" | "shadow-gate-dungeon" | "labyrinth-goblin-king" | "griffin-riders-escape";
}) {
  const [state, setState] = useState<HostProofState>(INITIAL_STATE);
  const [sessionNonce, setSessionNonce] = useState(0);
  const actionsRef = useRef<DragonFlightAction[]>([]);
  const checkpointsRef = useRef<QueuedDragonFlightActionCheckpoint[]>([]);
  const checkpointQueueRef = useRef<Promise<void>>(Promise.resolve());
  const attemptRef = useRef<IssuedDragonFlightAttempt | null>(null);
  const attemptGenerationRef = useRef(0);
  const submittedAttemptRef = useRef<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const payload = await readApiResponse(
        await fetch("/api/host-proof/games/completions?limit=10", { credentials: "same-origin" }),
      );
      const parsed = historyResponseSchema.parse(payload);
      setState((current) => ({ ...current, history: parsed.history }));
    } catch {
      setState((current) => ({ ...current, history: [] }));
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    let active = true;
    attemptGenerationRef.current += 1;
    actionsRef.current = [];
    checkpointsRef.current = [];
    checkpointQueueRef.current = Promise.resolve();
    attemptRef.current = null;
    submittedAttemptRef.current = null;
    setState((current) => ({
      ...current,
      attempt: null,
      cartridge: null,
      status: "starting",
      message: "Preparing your Dragon Flight session…",
      completion: null,
    }));

    void (async () => {
      try {
        const [attemptPayload, cartridgeModule] = await Promise.all([
          fetch("/api/host-proof/games/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ gameType, difficulty: "medium" }),
          }).then(readApiResponse),
          import("@/lib/host-proof-cartridge-loader"),
        ]);
        const attempt = issuedAttemptSchema.parse(attemptPayload);
        const cartridge = await loadHostProofCartridgeForGameType(cartridgeModule, gameType);
        if (!active) return;
        attemptRef.current = attempt;
        setState((current) => ({
          ...current,
          attempt,
          cartridge,
          status: "ready",
          message: "Choose a gate, then launch your flight.",
        }));
      } catch (error) {
        if (!active) return;
        setState((current) => ({
          ...current,
          status: "error",
          message: error instanceof Error ? error.message : "Unable to start Dragon Flight",
        }));
      }
    })();

    return () => {
      active = false;
    };
  }, [edition, sessionNonce, gameType]);

  const submitCompletion = useCallback(async () => {
    const attempt = state.attempt;
    const generation = attemptGenerationRef.current;
    const isCurrentAttempt = () => (
      attemptGenerationRef.current === generation
      && attemptRef.current?.attemptId === attempt?.attemptId
    );
    if (!attempt || !isCurrentAttempt() || submittedAttemptRef.current === attempt.attemptId) return;
    const actions = actionsRef.current;
    if (actions.length < 2 || actions.at(-1)?.kind !== "launch") {
      setState((current) => ({
        ...current,
        status: "error",
        message: "Dragon Flight did not record a valid gate-and-launch transcript.",
      }));
      return;
    }

    submittedAttemptRef.current = attempt.attemptId;
    setState((current) => ({
      ...current,
      status: "submitting",
      message: "Verifying your flight…",
      completion: null,
    }));
    try {
      await checkpointQueueRef.current;
      if (!isCurrentAttempt()) return;
      const checkpoints = checkpointsRef.current;
      if (checkpoints.length !== actions.length) {
        throw new Error("Dragon Flight is missing one or more server-observed action checkpoints.");
      }
      const checkpointTokens = checkpoints.map(({ checkpoint }) => checkpoint);
      const payload = await readApiResponse(
        await fetch("/api/host-proof/games/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            attemptId: attempt.attemptId,
            credential: attempt.credential,
            idempotencyKey: attempt.attemptId,
            actions,
            checkpoints: checkpointTokens,
          }),
        }),
      );
      if (!isCurrentAttempt()) return;
      const result = completionSchema.parse(payload);
      setState((current) => ({
        ...current,
        status: "completed",
        message: result.duplicate ? "This flight was already recorded." : "Flight recorded.",
        completion: result,
      }));
      void fetchHistory();
    } catch (error) {
      if (!isCurrentAttempt()) return;
      submittedAttemptRef.current = null;
      setState((current) => ({
        ...current,
        status: "error",
        message: error instanceof Error ? error.message : "Unable to verify this flight",
      }));
    }
  }, [fetchHistory, state.attempt]);

  const onDiagnostic = useCallback((event: APKDiagnosticEvent) => {
    if (event.code === "RUNTIME_READY") {
      attemptGenerationRef.current += 1;
      actionsRef.current = [];
      checkpointsRef.current = [];
      checkpointQueueRef.current = Promise.resolve();
      submittedAttemptRef.current = null;
      return;
    }
    const attempt = attemptRef.current;
    const action = actionFromDiagnostic(event, actionsRef.current.length + 1);
    if (!attempt || !action) return;
    const generation = attemptGenerationRef.current;
    const isCurrentAttempt = () => (
      attemptGenerationRef.current === generation
      && attemptRef.current?.attemptId === attempt.attemptId
    );
    actionsRef.current = [...actionsRef.current, action];
    checkpointQueueRef.current = checkpointQueueRef.current.then(async () => {
      if (!isCurrentAttempt()) return;
      try {
        const previousCheckpoint = checkpointsRef.current.at(-1);
        if (action.kind === "launch" && previousCheckpoint !== undefined) {
          const requiredDwellMs = previousCheckpoint.minimumNextActionDwellMs
            + HOST_PROOF_ACTION_DWELL_SAFETY_MARGIN_MS;
          const remainingDwellMs = requiredDwellMs - (Date.now() - previousCheckpoint.receivedAtMs);
          if (remainingDwellMs > 0) {
            await new Promise<void>((resolve) => { setTimeout(resolve, remainingDwellMs); });
          }
        }
        if (!isCurrentAttempt()) return;
        const payload = await readApiResponse(
          await fetch("/api/host-proof/games/attempts/actions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              attemptId: attempt.attemptId,
              credential: attempt.credential,
              action,
              ...(previousCheckpoint === undefined ? {} : { previousCheckpoint: previousCheckpoint.checkpoint }),
            }),
          }),
        );
        if (!isCurrentAttempt()) return;
        const observed = actionCheckpointSchema.parse(payload) as DragonFlightActionCheckpoint;
        checkpointsRef.current = [
          ...checkpointsRef.current,
          { ...observed, receivedAtMs: Date.now() },
        ];
      } catch (error) {
        if (!isCurrentAttempt()) return;
        throw error;
      }
    });
  }, []);

  const beginFreshFlight = useCallback(() => {
    attemptGenerationRef.current += 1;
    setSessionNonce((current) => current + 1);
  }, []);

  return (
    <section
      aria-label="Dragon Flight host-proof surface"
      className="mx-auto max-w-6xl px-4 py-8 text-slate-100"
      data-host-proof-boundary="dragon-flight-corrective-proof"
    >
      <header className="rounded-t-xl border border-slate-700 bg-slate-950 px-5 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">Authenticated APK proof</p>
        <h1 className="mt-2 text-3xl font-bold">Dragon Flight</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Choose the translation-matching gate, then launch. The game emits its own result; this host submits only
          server-observed action receipts and the runtime action transcript for server replay. Those receipts attest protocol sequencing, not human play, answer comprehension, or bot resistance.
        </p>
      </header>

      <div className="border-x border-b border-slate-700 bg-slate-900 p-4 sm:p-6">
        <p aria-live="polite" className="mb-4 text-sm text-slate-200">{state.message}</p>
        {state.status === "error" && <p role="alert" className="mb-4 text-sm text-rose-300">{state.message}</p>}
        {state.cartridge && state.attempt ? (
          <APKGameHost
            key={state.attempt.attemptId}
            aria-label="Dragon Flight vocabulary game"
            cartridge={state.cartridge}
            input={state.attempt.input}
            edition={edition}
            responsive={HOST_PROOF_RESPONSIVE_OPTIONS}
            canvasClassName="min-h-[560px] w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-950"
            className="space-y-4"
            instructions="Use Left and Right Arrow keys or tap a gate. Press Enter or Space to launch after a choice."
            onDiagnostic={onDiagnostic}
            onComplete={submitCompletion}
            showClientResult={false}
            showRestartControl={false}
          />
        ) : (
          <div className="min-h-[240px] rounded-lg border border-dashed border-slate-600 bg-slate-950/70 p-6 text-sm text-slate-300">
            {state.status === "error" ? "A new authenticated attempt is required before the game can mount." : "Loading real cartridge…"}
          </div>
        )}

        {state.completion && (
          <section aria-label="Verified Dragon Flight result" className="mt-5 rounded-lg border border-emerald-700 bg-emerald-950/40 p-4">
            <h2 className="font-semibold text-emerald-200">Verified result</h2>
            <p className="mt-1 text-sm">
              Score {state.completion.score} · Accuracy {Math.round(state.completion.accuracy * 100)}% · {state.completion.xpEarned} XP
              {" · "}{state.completion.victory ? "Victory confirmed" : "Flight recorded"}
            </p>
          </section>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={beginFreshFlight}
            className="min-h-11 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
          >
            Start a fresh flight
          </button>
          <p className="text-xs text-slate-400">Pixel art assets by ElvGames. This bounded proof does not publish a production catalog.</p>
        </div>
      </div>

      <section aria-label="Dragon Flight proof history" className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-5">
        <h2 className="text-lg font-semibold">Your recent verified flights</h2>
        {state.history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No verified Dragon Flight completions yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {state.history.map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-2 rounded border border-slate-800 px-3 py-2">
                <span>{entry.score} points · {Math.round(entry.accuracy * 100)}%</span>
                <span className="text-slate-400">{entry.xpEarned} XP</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
