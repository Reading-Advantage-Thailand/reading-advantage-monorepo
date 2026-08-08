import { fireEvent, render, screen } from "@testing-library/react";

import type {
  APKDiagnosticEvent,
  RuntimeEdition,
} from "@reading-advantage/advantage-play-kit/runtime";

const mockLoadDragonFlightHostProofCartridge = jest.fn();

jest.mock("@/lib/host-proof-qc-loader", () => ({
  loadDragonFlightHostProofCartridge: mockLoadDragonFlightHostProofCartridge,
}));

jest.mock(
  "@reading-advantage/advantage-play-kit/responsive",
  () => ({ DEFAULT_RESPONSIVE_LAYOUT_CONFIG: {} }),
  { virtual: true },
);

jest.mock(
  "@reading-advantage/advantage-play-kit/react",
  () => ({
    APKGameHost: ({ onComplete, onDiagnostic }: {
      readonly onComplete?: () => void | Promise<void>;
      readonly onDiagnostic?: (event: APKDiagnosticEvent) => void;
    }) => (
      <button
        type="button"
        data-testid="dragon-flight-runtime"
        onClick={() => {
          onDiagnostic?.({ level: "info", code: "RUNTIME_READY", message: "ready", timestamp: 1 });
          onDiagnostic?.({
            level: "info",
            code: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
            message: "gate chosen",
            timestamp: 2,
            details: { kind: "choose-gate", gate: "right", elapsedMs: 400 },
          });
          onDiagnostic?.({
            level: "info",
            code: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
            message: "launch requested",
            timestamp: 3,
            details: { kind: "launch", elapsedMs: 700 },
          });
          void onComplete?.();
        }}
      >
        Emit Dragon Flight transcript
      </button>
    ),
  }),
  { virtual: true },
);

import { HostProofGameClient } from "@/components/host-proof/HostProofGameClient";

const issuedAttempt = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  credential: "opaque-host-proof-credential",
  input: [{ term: "dragon", translation: "drago" }],
  expiresAt: "2026-08-01T00:10:00.000Z",
};

/** Returns the server transport double used by the bounded client proof. */
function createFetchMock() {
  return jest.fn(async (url: string | URL | Request) => {
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
    jest.clearAllMocks();
    mockLoadDragonFlightHostProofCartridge.mockResolvedValue({ manifest: { id: "dragon-flight" } });
  });

  it("issues a signed attempt and submits only title diagnostics to the completion boundary", async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock as typeof fetch;

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
