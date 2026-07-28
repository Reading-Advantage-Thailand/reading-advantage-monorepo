"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  EXISTING_CORE_HOST_PROOF_BINDINGS,
  type ExistingCoreHostProofBinding,
  type ExistingCoreHostProofCartridgeId,
} from "@reading-advantage/game-contracts";
import type {
  ExistingCoreQcCartridge,
  ExistingCoreQcInputModality,
  ExistingCoreQcSession,
  ExistingCoreQcSessionSnapshot,
} from "@reading-advantage/game-cartridges/qc";
import type { HostProofCompletionResponse, HostProofHistoryEntry } from "@reading-advantage/domain/games";

type CompletionStatus = "idle" | "submitting" | "success" | "duplicate" | "error";

const COMPACT_MAX_WIDTH = 767;

function getViewportProfile(width: number): "compact" | "wide" {
  return width <= COMPACT_MAX_WIDTH ? "compact" : "wide";
}

function makeIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface HostProofUiState {
  selectedId: ExistingCoreHostProofCartridgeId;
  profile: "compact" | "wide";
  session: ExistingCoreQcSession | null;
  snapshot: ExistingCoreQcSessionSnapshot | null;
  cartridge: ExistingCoreQcCartridge | null;
  loading: boolean;
  loadError: string;
  totalAttempts: number;
  correctAnswers: number;
  completionStatus: CompletionStatus;
  completionResult: HostProofCompletionResponse | null;
  completionError: string;
  history: HostProofHistoryEntry[];
  historyLoading: boolean;
  completionAttemptId: string;
  replayNonce: number;
}

function initialState(bindings: readonly ExistingCoreHostProofBinding[]): HostProofUiState {
  return {
    selectedId: bindings[0].id,
    profile: "compact",
    session: null,
    snapshot: null,
    cartridge: null,
    loading: true,
    loadError: "",
    totalAttempts: 0,
    correctAnswers: 0,
    completionStatus: "idle",
    completionResult: null,
    completionError: "",
    history: [],
    historyLoading: true,
    completionAttemptId: makeIdempotencyKey(),
    replayNonce: 0,
  };
}

/**
 * Renders the bounded client-only Task-5 cartridge host-proof surface.
 * @returns The interactive hidden host-proof UI.
 */
export function HostProofGameClient() {
  const bindings = useMemo(() => EXISTING_CORE_HOST_PROOF_BINDINGS, []);
  const [state, setState] = useState<HostProofUiState>(() => initialState(bindings));

  useEffect(() => {
    const handleResize = () => {
      setState((prev) => {
        if (!prev.session) {
          return { ...prev, profile: getViewportProfile(window.innerWidth) };
        }

        prev.session.resize({ width: window.innerWidth, height: window.innerHeight });
        return {
          ...prev,
          profile: getViewportProfile(window.innerWidth),
          snapshot: prev.session.snapshot(),
        };
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, loadError: "" }));

    void (async () => {
      try {
        const { loadExistingCoreQcCartridge } = await import("@reading-advantage/game-cartridges/qc");
        const cartridge = await loadExistingCoreQcCartridge(state.selectedId);
        if (!active) return;
        const session = cartridge.createQcSession();
        const snapshot = session.snapshot();
        setState((prev) => ({
          ...prev,
          cartridge,
          session,
          snapshot,
          loading: false,
          totalAttempts: 0,
          correctAnswers: 0,
          completionStatus: "idle",
          completionResult: null,
          completionError: "",
        }));
      } catch (error) {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          loadError: error instanceof Error ? error.message : "Failed to load cartridge",
        }));
      }
    })();

    return () => {
      active = false;
    };
  }, [state.selectedId, state.replayNonce]);

  const fetchHistory = async () => {
    setState((prev) => ({ ...prev, historyLoading: true }));
    try {
      const response = await fetch("/api/host-proof/games/completions?limit=50");
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || "Failed to load history");
      }
      const data = (await response.json()) as { history: HostProofHistoryEntry[] };
      setState((prev) => ({ ...prev, history: data.history, historyLoading: false }));
    } catch {
      setState((prev) => ({
        ...prev,
        history: [],
        historyLoading: false,
      }));
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, []);

  const dispatch = (modality: ExistingCoreQcInputModality, intent: "primary" | "secondary") => {
    setState((prev) => {
      if (!prev.session) return prev;
      prev.session.dispatch(modality, intent);
      return {
        ...prev,
        snapshot: prev.session.snapshot(),
        totalAttempts: prev.totalAttempts + 1,
        correctAnswers: intent === "primary" ? prev.correctAnswers + 1 : prev.correctAnswers,
        completionStatus: "idle",
        completionResult: null,
        completionError: "",
      };
    });
  };

  const complete = async () => {
    if (!state.cartridge || state.totalAttempts === 0) return;
    setState((prev) => ({
      ...prev,
      completionStatus: "submitting",
      completionResult: null,
      completionError: "",
    }));

    const payload = {
      gameType: state.selectedId,
      difficulty: "medium" as const,
      score: state.correctAnswers * 100,
      accuracy: state.correctAnswers / state.totalAttempts,
      correctAnswers: state.correctAnswers,
      totalAttempts: state.totalAttempts,
      duration: 1000,
      victory: true,
      idempotencyKey: state.completionAttemptId,
      clientTimestamp: Date.now(),
    };

    try {
      const response = await fetch("/api/host-proof/games/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error?.message || `Completion failed with status ${response.status}`);
      }

      const result = data as HostProofCompletionResponse;
      setState((prev) => ({
        ...prev,
        completionStatus: result.duplicate ? "duplicate" : "success",
        completionResult: result,
        completionError: "",
      }));
      void fetchHistory();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        completionStatus: "error",
        completionError: error instanceof Error ? error.message : "Completion failed",
      }));
    }
  };

  const selectCartridge = (id: string) => {
    const binding = bindings.find((b) => b.id === id);
    if (binding) {
      setState((prev) => ({
        ...prev,
        selectedId: binding.id,
        session: null,
        snapshot: null,
        cartridge: null,
        loading: true,
        totalAttempts: 0,
        correctAnswers: 0,
        completionStatus: "idle",
        completionResult: null,
        completionError: "",
        completionAttemptId: makeIdempotencyKey(),
      }));
    }
  };

  const replay = () => {
    setState((prev) => ({
      ...prev,
      session: null,
      snapshot: null,
      cartridge: null,
      loading: true,
      totalAttempts: 0,
      correctAnswers: 0,
      completionStatus: "idle",
      completionResult: null,
      completionError: "",
      completionAttemptId: makeIdempotencyKey(),
      replayNonce: prev.replayNonce + 1,
    }));
  };

  const navigateCartridge = (direction: -1 | 1) => {
    const currentIndex = bindings.findIndex((binding) => binding.id === state.selectedId);
    const nextIndex = (currentIndex + direction + bindings.length) % bindings.length;
    selectCartridge(bindings[nextIndex].id);
  };

  const selectedBinding = bindings.find((b) => b.id === state.selectedId);
  const inputCounts = state.snapshot?.inputCounts ?? { keyboard: 0, pointer: 0, touch: 0 };

  return (
    <section
      aria-label="Existing-core host-proof surface"
      className="mx-auto max-w-7xl px-4 py-8"
      data-host-proof-boundary="reading-primary-host-proof-only"
    >
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Task 5 / host-proof only</p>
        <h1 className="mt-2 text-3xl font-bold">Existing-core host proof</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Bounded hidden surface for Reading and Primary. Loads only the five accepted Task-4 cartridges through the
          shared host-proof contract. Not a production catalog, cutover, retirement, or cohort acceptance.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cartridge</CardTitle>
              <CardDescription>Select one accepted title</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                aria-label="Select host-proof cartridge"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(e) => selectCartridge(e.target.value)}
                value={state.selectedId}
              >
                {bindings.map((binding) => (
                  <option key={binding.id} value={binding.id}>
                    {binding.title}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex gap-2">
                <Button
                  aria-label="Previous host-proof cartridge"
                  onClick={() => navigateCartridge(-1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  aria-label="Next host-proof cartridge"
                  onClick={() => navigateCartridge(1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
              {selectedBinding && (
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Input mode</span>
                    <Badge variant="outline">{selectedBinding.inputMode}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scope</span>
                    <Badge variant="outline">{selectedBinding.temporalScope}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profile</span>
                    <Badge variant="outline" data-testid="host-proof-profile">
                      {state.profile}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">History</CardTitle>
              <CardDescription>Recent host-proof completions</CardDescription>
            </CardHeader>
            <CardContent>
              {state.historyLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : state.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completions recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {state.history.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-md border border-border p-2 text-xs"
                      data-testid="host-proof-history-item"
                    >
                      <div className="font-semibold">{entry.gameType}</div>
                      <div className="text-muted-foreground">
                        {entry.xpEarned} XP · {Math.round(entry.accuracy * 100)}% ·{" "}
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>

        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{selectedBinding?.title ?? "Loading…"}</CardTitle>
              <CardDescription>Real input drives the accepted deterministic mechanic</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.loadError ? (
                <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm">
                  {state.loadError}
                </p>
              ) : state.loading ? (
                <p className="text-sm text-muted-foreground">Loading cartridge…</p>
              ) : state.cartridge && state.session ? (
                <>
                  <div
                    className={`rounded-md border-2 border-dashed border-border bg-muted p-6 ${
                      state.profile === "compact" ? "max-w-sm" : "max-w-3xl"
                    }`}
                    data-testid="host-proof-game-container"
                    data-profile={state.profile}
                    onKeyDown={(e) => {
                      if (e.code === "Enter" || e.code === "Space" || e.code === "ArrowRight") {
                        e.preventDefault();
                        dispatch("keyboard", "primary");
                      } else if (e.code === "Backspace" || e.code === "ArrowLeft") {
                        e.preventDefault();
                        dispatch("keyboard", "secondary");
                      }
                    }}
                    onPointerDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const intent = e.clientX - rect.left >= rect.width / 2 ? "primary" : "secondary";
                      const modality: ExistingCoreQcInputModality = e.pointerType === "touch" ? "touch" : "pointer";
                      dispatch(modality, intent);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${selectedBinding?.title} host-proof input area. Right half or Enter for primary, left half or Backspace for secondary.`}
                  >
                    <div className="pointer-events-none select-none text-center">
                      <p className="text-lg font-bold">{selectedBinding?.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {state.profile === "compact" ? "Compact" : "Wide"} container
                      </p>
                      <p className="mt-4 text-xs text-muted-foreground">
                        Keyboard: Enter/Space/Right = correct · Backspace/Left = incorrect
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pointer/Touch: right half = correct · left half = incorrect
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-md border border-border p-3 text-center">
                      <div className="text-xs text-muted-foreground">Keyboard</div>
                      <div className="text-lg font-semibold" data-testid="host-proof-keyboard-count">
                        {inputCounts.keyboard}
                      </div>
                    </div>
                    <div className="rounded-md border border-border p-3 text-center">
                      <div className="text-xs text-muted-foreground">Pointer</div>
                      <div className="text-lg font-semibold" data-testid="host-proof-pointer-count">
                        {inputCounts.pointer}
                      </div>
                    </div>
                    <div className="rounded-md border border-border p-3 text-center">
                      <div className="text-xs text-muted-foreground">Touch</div>
                      <div className="text-lg font-semibold" data-testid="host-proof-touch-count">
                        {inputCounts.touch}
                      </div>
                    </div>
                    <div className="rounded-md border border-border p-3 text-center">
                      <div className="text-xs text-muted-foreground">Correct / Attempts</div>
                      <div className="text-lg font-semibold" data-testid="host-proof-score">
                        {state.correctAnswers} / {state.totalAttempts}
                      </div>
                    </div>
                  </div>

                  <pre
                    className="max-h-40 overflow-auto rounded-md border border-border bg-muted p-3 text-xs"
                    data-testid="host-proof-mechanic-snapshot"
                  >
                    {JSON.stringify(state.snapshot?.mechanic ?? {}, null, 2)}
                  </pre>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => dispatch("pointer", "secondary")}
                      data-testid="host-proof-secondary-button"
                    >
                      Incorrect
                    </Button>
                    <Button
                      onClick={() => dispatch("pointer", "primary")}
                      data-testid="host-proof-primary-button"
                    >
                      Correct
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={state.totalAttempts === 0 || state.completionStatus === "submitting"}
                      onClick={complete}
                      data-testid="host-proof-complete-button"
                    >
                      {state.completionStatus === "submitting" ? "Submitting…" : "Complete"}
                    </Button>
                    <Button
                      data-testid="host-proof-replay-button"
                      onClick={replay}
                      type="button"
                      variant="outline"
                    >
                      Replay
                    </Button>
                  </div>

                  {state.completionStatus === "success" && state.completionResult && (
                    <p className="rounded-md border border-green-600/20 bg-green-600/10 p-3 text-sm text-green-700">
                      Completed! +{state.completionResult.xpEarned} XP · activityId{" "}
                      {state.completionResult.activityId}
                    </p>
                  )}
                  {state.completionStatus === "duplicate" && state.completionResult && (
                    <p className="rounded-md border border-yellow-600/20 bg-yellow-600/10 p-3 text-sm text-yellow-700">
                      Duplicate completion recorded (no additional XP).
                    </p>
                  )}
                  {state.completionStatus === "error" && (
                    <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm">
                      {state.completionError}
                    </p>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
