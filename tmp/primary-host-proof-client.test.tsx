/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RuntimeEdition } from "@reading-advantage/advantage-play-kit/runtime";

const mockLoadDragonFlightHostProofCartridge = vi.fn();

vi.mock("@/lib/host-proof-cartridge-loader", () => ({
  loadDragonFlightHostProofCartridge: mockLoadDragonFlightHostProofCartridge,
}));

vi.mock("@reading-advantage/advantage-play-kit/react", () => ({
  APKGameHost: ({ onComplete, onDiagnostic }: {
    readonly onComplete?: () => void | Promise<void>;
    readonly onDiagnostic?: (event: Record<string, unknown>) => void;
  }) => (
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
  ),
}));

const issuedAttempt = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  credential: "opaque-host-proof-credential",
  input: [{ term: "dragon", translation: "drago" }],
  expiresAt: "2026-08-01T00:10:00.000Z",
};

/** Returns the server transport double used by the bounded client proof. */
function createFetchMock() {
  return vi.fn(async (url: string | URL | Request) => {
    if (String(url).includes("?limit=10")) {
      return { ok: true, status: 200, json: async () => ({ history: [] }) } as Response;
    }
    if (String(url) === "/api/host-proof/games/attempts") {
      return { ok: true, status: 201, json: async () => issuedAttempt } as Response;
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
  });

  it("issues a signed attempt and submits only title diagnostics to the completion boundary", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const { HostProofGameClient } = await import("../HostProofGameClient");

    render(<HostProofGameClient edition={{} as RuntimeEdition} />);

    fireEvent.click(await screen.findByTestId("dragon-flight-runtime"));
    await screen.findByRole("heading", { name: "Verified result" });

    const attemptRequest = fetchMock.mock.calls.find(([url]) => String(url) === "/api/host-proof/games/attempts");
    expect(attemptRequest).toBeDefined();
    expect(JSON.parse(String(attemptRequest?.[1]?.body))).toEqual({ gameType: "dragon-flight", difficulty: "medium" });

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
    });
    expect(await screen.findByText(/Score 100/)).toBeInTheDocument();
  });
});
