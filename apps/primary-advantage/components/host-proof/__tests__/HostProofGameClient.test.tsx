/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RuntimeEdition } from "@reading-advantage/advantage-play-kit/runtime";

const mockLoadDragonFlightHostProofCartridge = vi.fn();
const mockLoadMagicDefenseHostProofCartridge = vi.fn();
const mockLoadDungeonLiberatorHostProofCartridge = vi.fn();

vi.mock("@/lib/host-proof-cartridge-loader", () => ({
  loadDragonFlightHostProofCartridge: mockLoadDragonFlightHostProofCartridge,
  loadMagicDefenseHostProofCartridge: mockLoadMagicDefenseHostProofCartridge,
  loadDungeonLiberatorHostProofCartridge: mockLoadDungeonLiberatorHostProofCartridge,
}));

vi.mock(
  "@reading-advantage/game-cartridges/legacy-defense-host-proof",
  () => ({
    loadLegacyDefenseHostProofCartridge: vi.fn(async (id: string) => ({ manifest: { id } })),
  }),
  { virtual: true },
);

// Vitest/Vite analyzes all dynamic imports in HostProofGameClient; stub sibling
// package subpaths so multi-title client tests resolve without a package rebuild.
vi.mock(
  "@reading-advantage/game-cartridges/legacy-puzzle-host-proof",
  () => ({
    loadLegacyPuzzleHostProofCartridge: vi.fn(async (id: string) => ({ manifest: { id } })),
  }),
  { virtual: true },
);

vi.mock(
  "@reading-advantage/game-cartridges/legacy-traversal-host-proof",
  () => ({
    loadLegacyTraversalHostProofCartridge: vi.fn(async (id: string) => ({ manifest: { id } })),
  }),
  { virtual: true },
);

vi.mock("@reading-advantage/advantage-play-kit/react", () => ({
  APKGameHost: ({ onComplete, onDiagnostic }: {
    readonly onComplete?: () => void | Promise<void>;
    readonly onDiagnostic?: (event: Record<string, unknown>) => void;
  }) => (
  <>
    <button
      type="button"
      data-testid="dragon-flight-runtime"
      onClick={() => {
        onDiagnostic?.({ level: "info", code: "RUNTIME_READY", message: "ready" });
        onDiagnostic?.({
          level: "info",
          code: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
          message: "gate chosen",
          details: { kind: "choose-gate", gate: "right", elapsedMs: 400 },
        });
        onDiagnostic?.({
          level: "info",
          code: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
          message: "launch requested",
          details: { kind: "launch", elapsedMs: 700 },
        });
        void onComplete?.();
      }}
    >
      Emit Dragon Flight transcript
    </button>
    <button
      type="button"
      data-testid="dragon-flight-gate-only"
      onClick={() => {
        onDiagnostic?.({
          level: "info",
          code: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
          message: "gate chosen",
          details: { kind: "choose-gate", gate: "right", elapsedMs: 400 },
        });
      }}
    >
      Emit Dragon Flight gate
    </button>
    <button
      type="button"
      data-testid="magic-defense-runtime"
      onClick={() => {
        onDiagnostic?.({ level: "info", code: "RUNTIME_READY", message: "ready" });
        onDiagnostic?.({
          level: "info",
          code: "MAGIC_DEFENSE_HOST_PROOF_ACTION",
          message: "gate chosen",
          details: { kind: "choose-gate", gate: "right", elapsedMs: 400 },
        });
        onDiagnostic?.({
          level: "info",
          code: "MAGIC_DEFENSE_HOST_PROOF_ACTION",
          message: "launch requested",
          details: { kind: "launch", elapsedMs: 700 },
        });
        void onComplete?.();
      }}
    >
      Emit Magic Defense transcript
    </button>
    <button
      type="button"
      data-testid="castle-defense-runtime"
      onClick={() => {
        onDiagnostic?.({ level: "info", code: "RUNTIME_READY", message: "ready" });
        onDiagnostic?.({
          level: "info",
          code: "CASTLE_DEFENSE_HOST_PROOF_ACTION",
          message: "gate chosen",
          details: { kind: "choose-gate", gate: "left", elapsedMs: 350 },
        });
        onDiagnostic?.({
          level: "info",
          code: "CASTLE_DEFENSE_HOST_PROOF_ACTION",
          message: "launch requested",
          details: { kind: "launch", elapsedMs: 650 },
        });
        void onComplete?.();
      }}
    >
      Emit Castle Defense transcript
    </button>
    <button
      type="button"
      data-testid="non-host-proof-diagnostic"
      onClick={() => {
        onDiagnostic?.({ level: "info", code: "RUNTIME_READY", message: "ready" });
        onDiagnostic?.({
          level: "info",
          code: "SOME_OTHER_EVENT",
          message: "gate chosen",
          details: { kind: "choose-gate", gate: "right", elapsedMs: 400 },
        });
      }}
    >
      Emit unrelated diagnostic
    </button>
  </>
  ),
}));

const issuedAttempt = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  credential: "opaque-host-proof-credential",
  input: [{ term: "dragon", translation: "drago" }],
  expiresAt: "2026-08-01T00:10:00.000Z",
};

const completedHistory = Object.freeze([{
  id: "completion-1",
  gameType: "dragon-flight",
  difficulty: "medium",
  score: 100,
  accuracy: 1,
  xpEarned: 5,
  activityId: "game:dragon-flight:11111111-1111-4111-8111-111111111111",
  createdAt: "2026-08-01T00:00:01.000Z",
}]);

/**
 * Returns the server transport double used by the bounded client proof.
 * @param historyAfterCompletion History returned only after the signed completion succeeds.
 * @param onActionRequest Optional observer for each public action-attestation request.
 * @param failAtAction Optional action sequence for a rejected attestation response.
 * @returns A mock Fetch implementation for the bounded host endpoints.
 */
function createFetchMock(
  historyAfterCompletion: readonly (typeof completedHistory)[number][] = [],
  onActionRequest?: (body: unknown) => void,
  failAtAction?: number,
) {
  let historyRequestCount = 0;
  let checkpointNumber = 0;
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).includes("?limit=10")) {
      const history = historyRequestCount === 0 ? [] : historyAfterCompletion;
      historyRequestCount += 1;
      return { ok: true, status: 200, json: async () => ({ history }) } as Response;
    }
    if (String(url) === "/api/host-proof/games/attempts") {
      return { ok: true, status: 201, json: async () => issuedAttempt } as Response;
    }
    if (String(url) === "/api/host-proof/games/attempts/actions") {
      const body = JSON.parse(String(init?.body));
      onActionRequest?.(body);
      checkpointNumber += 1;
      if (checkpointNumber === failAtAction) {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Action observation was rejected" } }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          checkpoint: "checkpoint-" + checkpointNumber,
          minimumNextActionDwellMs: checkpointNumber === 1 ? 320 : 0,
        }),
      } as Response;
    }
    if (String(url) === "/api/host-proof/games/completions") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          xpEarned: 5,
          score: 100,
          accuracy: 1,
          correctAnswers: 1,
          totalAttempts: 1,
          duration: 700,
          victory: true,
          duplicate: false,
        }),
      } as Response;
    }
    throw new Error(`Unexpected host-proof request: ${String(url)}`);
  });
}

describe("HostProofGameClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadDragonFlightHostProofCartridge.mockResolvedValue({ manifest: { id: "dragon-flight" } });
    mockLoadMagicDefenseHostProofCartridge.mockResolvedValue({ manifest: { id: "magic-defense" } });
  });

  it("issues a signed attempt, submits only title diagnostics, and accepts the complete authoritative response", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const { HostProofGameClient } = await import("../HostProofGameClient");

    render(<HostProofGameClient edition={{} as RuntimeEdition} />);

    fireEvent.click(await screen.findByTestId("dragon-flight-runtime"));
    await screen.findByRole("heading", { name: "Verified result" }, { timeout: 3000 });

    const attemptRequest = fetchMock.mock.calls.find(([url]) => String(url) === "/api/host-proof/games/attempts");
    expect(attemptRequest).toBeDefined();
    expect(JSON.parse(String(attemptRequest?.[1]?.body))).toEqual({ gameType: "dragon-flight", difficulty: "medium" });

    const actionRequests = fetchMock.mock.calls.filter(([url]) => String(url) === "/api/host-proof/games/attempts/actions");
    expect(actionRequests).toHaveLength(2);
    expect(JSON.parse(String(actionRequests[0]?.[1]?.body))).toEqual({
      attemptId: issuedAttempt.attemptId,
      credential: issuedAttempt.credential,
      action: { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
    });
    expect(JSON.parse(String(actionRequests[1]?.[1]?.body))).toEqual({
      attemptId: issuedAttempt.attemptId,
      credential: issuedAttempt.credential,
      action: { sequence: 2, kind: "launch", elapsedMs: 700 },
      previousCheckpoint: "checkpoint-1",
    });

    const completionRequest = fetchMock.mock.calls.find(([url]) => String(url) === "/api/host-proof/games/completions");
    expect(completionRequest).toBeDefined();
    expect(JSON.parse(String(completionRequest?.[1]?.body))).toEqual({
      attemptId: issuedAttempt.attemptId,
      credential: issuedAttempt.credential,
      idempotencyKey: issuedAttempt.attemptId,
      actions: [
        { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
        { sequence: 2, kind: "launch", elapsedMs: 700 },
      ],
      checkpoints: ["checkpoint-1", "checkpoint-2"],
    });
    expect(await screen.findByText(/Score 100/)).toBeInTheDocument();
    expect(screen.getByLabelText("Verified Dragon Flight result")).toHaveTextContent("Victory confirmed");
  });

  it("discards an old in-flight receipt before a fresh sequence-one action", async () => {
    let resolveStaleAction: (response: Response) => void = () => undefined;
    const staleActionResponse = new Promise<Response>((resolve) => { resolveStaleAction = resolve; });
    const freshAttempt = { ...issuedAttempt, attemptId: "22222222-2222-4222-8222-222222222222" };
    let issuedAttemptCount = 0;
    const actionBodies: unknown[] = [];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("?limit=10")) {
        return { ok: true, status: 200, json: async () => ({ history: [] }) } as Response;
      }
      if (String(url) === "/api/host-proof/games/attempts") {
        issuedAttemptCount += 1;
        return { ok: true, status: 201, json: async () => issuedAttemptCount === 1 ? issuedAttempt : freshAttempt } as Response;
      }
      if (String(url) === "/api/host-proof/games/attempts/actions") {
        const body = JSON.parse(String(init?.body));
        actionBodies.push(body);
        if (actionBodies.length === 1) return staleActionResponse;
        return { ok: true, status: 200, json: async () => ({ checkpoint: "fresh-checkpoint", minimumNextActionDwellMs: 250 }) } as Response;
      }
      if (String(url) === "/api/host-proof/games/completions") {
        return { ok: true, status: 200, json: async () => ({}) } as Response;
      }
      throw new Error("Unexpected host-proof request: " + String(url));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { HostProofGameClient } = await import("../HostProofGameClient");

    render(<HostProofGameClient edition={{} as RuntimeEdition} />);
    fireEvent.click(await screen.findByTestId("dragon-flight-gate-only"));
    await waitFor(() => expect(actionBodies).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "Start a fresh flight" }));
    await waitFor(() => expect(issuedAttemptCount).toBe(2));
    resolveStaleAction({
      ok: true,
      status: 200,
      json: async () => ({ checkpoint: "stale-checkpoint", minimumNextActionDwellMs: 250 }),
    } as Response);
    await new Promise<void>((resolve) => { setTimeout(resolve, 0); });

    fireEvent.click(await screen.findByTestId("dragon-flight-gate-only"));
    await waitFor(() => expect(actionBodies).toHaveLength(2));

    expect(actionBodies[1]).toEqual(expect.objectContaining({
      attemptId: freshAttempt.attemptId,
      action: { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
    }));
    expect(actionBodies[1]).not.toHaveProperty("previousCheckpoint");
    expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/host-proof/games/completions")).toBe(false);
    expect(screen.queryByRole("heading", { name: "Verified result" })).not.toBeInTheDocument();
  });

  it("fails closed without every ordered action receipt", async () => {
    const fetchMock = createFetchMock([], undefined, 2);
    vi.stubGlobal("fetch", fetchMock);
    const { HostProofGameClient } = await import("../HostProofGameClient");

    render(<HostProofGameClient edition={{} as RuntimeEdition} />);

    fireEvent.click(await screen.findByTestId("dragon-flight-runtime"));
    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent("Action observation was rejected");
    expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/host-proof/games/completions")).toBe(false);
  });

  it("stages same-frame launch diagnostics by the server-issued dwell before completion", async () => {
    const observedActionRequests: Array<{ readonly requestedAt: number; readonly body: unknown }> = [];
    const fetchMock = createFetchMock([], (body) => {
      observedActionRequests.push({ requestedAt: Date.now(), body });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { HostProofGameClient } = await import("../HostProofGameClient");

    render(<HostProofGameClient edition={{} as RuntimeEdition} />);

    fireEvent.click(await screen.findByTestId("dragon-flight-runtime"));
    await screen.findByRole("heading", { name: "Verified result" }, { timeout: 3000 });

    expect(observedActionRequests).toHaveLength(2);
    expect(observedActionRequests[1]!.requestedAt - observedActionRequests[0]!.requestedAt).toBeGreaterThanOrEqual(320);
    const completionIndex = fetchMock.mock.calls.findIndex(([url]) => String(url) === "/api/host-proof/games/completions");
    const finalActionIndex = fetchMock.mock.calls.map(([url]) => String(url)).lastIndexOf("/api/host-proof/games/attempts/actions");
    expect(completionIndex).toBeGreaterThan(finalActionIndex);
  });

  it("refreshes non-empty server-derived Dragon Flight history after a signed completion", async () => {
    const fetchMock = createFetchMock(completedHistory);
    vi.stubGlobal("fetch", fetchMock);
    const { HostProofGameClient } = await import("../HostProofGameClient");

    render(<HostProofGameClient edition={{} as RuntimeEdition} />);

    fireEvent.click(await screen.findByTestId("dragon-flight-runtime"));
    await screen.findByRole("heading", { name: "Verified result" }, { timeout: 3000 });

    await expect(screen.findByText(/100 points.*100%/)).resolves.toBeInTheDocument();
    expect(screen.getByLabelText("Dragon Flight proof history")).not.toHaveTextContent("No verified Dragon Flight completions yet.");
  });

  it("accepts MAGIC_DEFENSE_HOST_PROOF_ACTION diagnostics for magic-defense gameType", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const { HostProofGameClient } = await import("../HostProofGameClient");

    render(<HostProofGameClient edition={{} as RuntimeEdition} gameType="magic-defense" />);

    fireEvent.click(await screen.findByTestId("magic-defense-runtime"));
    await screen.findByRole("heading", { name: "Verified result" }, { timeout: 3000 });

    expect(mockLoadMagicDefenseHostProofCartridge).toHaveBeenCalled();
    const attemptRequest = fetchMock.mock.calls.find(([url]) => String(url) === "/api/host-proof/games/attempts");
    expect(attemptRequest).toBeDefined();
    expect(JSON.parse(String(attemptRequest?.[1]?.body))).toEqual({ gameType: "magic-defense", difficulty: "medium" });

    const actionRequests = fetchMock.mock.calls.filter(([url]) => String(url) === "/api/host-proof/games/attempts/actions");
    expect(actionRequests).toHaveLength(2);
    expect(JSON.parse(String(actionRequests[0]?.[1]?.body))).toEqual({
      attemptId: issuedAttempt.attemptId,
      credential: issuedAttempt.credential,
      action: { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
    });
    expect(JSON.parse(String(actionRequests[1]?.[1]?.body))).toEqual({
      attemptId: issuedAttempt.attemptId,
      credential: issuedAttempt.credential,
      action: { sequence: 2, kind: "launch", elapsedMs: 700 },
      previousCheckpoint: "checkpoint-1",
    });

    const completionRequest = fetchMock.mock.calls.find(([url]) => String(url) === "/api/host-proof/games/completions");
    expect(completionRequest).toBeDefined();
    expect(JSON.parse(String(completionRequest?.[1]?.body))).toEqual({
      attemptId: issuedAttempt.attemptId,
      credential: issuedAttempt.credential,
      idempotencyKey: issuedAttempt.attemptId,
      actions: [
        { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
        { sequence: 2, kind: "launch", elapsedMs: 700 },
      ],
      checkpoints: ["checkpoint-1", "checkpoint-2"],
    });
  });

  it("accepts CASTLE_DEFENSE_HOST_PROOF_ACTION diagnostics for castle-defense gameType", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const { HostProofGameClient } = await import("../HostProofGameClient");

    render(<HostProofGameClient edition={{} as RuntimeEdition} gameType="castle-defense" />);

    fireEvent.click(await screen.findByTestId("castle-defense-runtime"));
    await screen.findByRole("heading", { name: "Verified result" }, { timeout: 3000 });

    const attemptRequest = fetchMock.mock.calls.find(([url]) => String(url) === "/api/host-proof/games/attempts");
    expect(attemptRequest).toBeDefined();
    expect(JSON.parse(String(attemptRequest?.[1]?.body))).toEqual({ gameType: "castle-defense", difficulty: "medium" });

    const actionRequests = fetchMock.mock.calls.filter(([url]) => String(url) === "/api/host-proof/games/attempts/actions");
    expect(actionRequests).toHaveLength(2);
    expect(JSON.parse(String(actionRequests[0]?.[1]?.body))).toEqual({
      attemptId: issuedAttempt.attemptId,
      credential: issuedAttempt.credential,
      action: { sequence: 1, kind: "choose-gate", gate: "left", elapsedMs: 350 },
    });
    expect(JSON.parse(String(actionRequests[1]?.[1]?.body))).toEqual({
      attemptId: issuedAttempt.attemptId,
      credential: issuedAttempt.credential,
      action: { sequence: 2, kind: "launch", elapsedMs: 650 },
      previousCheckpoint: "checkpoint-1",
    });

    const completionRequest = fetchMock.mock.calls.find(([url]) => String(url) === "/api/host-proof/games/completions");
    expect(completionRequest).toBeDefined();
    expect(JSON.parse(String(completionRequest?.[1]?.body))).toEqual({
      attemptId: issuedAttempt.attemptId,
      credential: issuedAttempt.credential,
      idempotencyKey: issuedAttempt.attemptId,
      actions: [
        { sequence: 1, kind: "choose-gate", gate: "left", elapsedMs: 350 },
        { sequence: 2, kind: "launch", elapsedMs: 650 },
      ],
      checkpoints: ["checkpoint-1", "checkpoint-2"],
    });
  });

  it("ignores non-host-proof action diagnostics", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const { HostProofGameClient } = await import("../HostProofGameClient");

    render(<HostProofGameClient edition={{} as RuntimeEdition} />);

    fireEvent.click(await screen.findByTestId("non-host-proof-diagnostic"));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/host-proof/games/attempts")).toBe(true);
    });

    expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/host-proof/games/attempts/actions")).toHaveLength(0);
    expect(screen.queryByRole("heading", { name: "Verified result" })).not.toBeInTheDocument();
  });
});
