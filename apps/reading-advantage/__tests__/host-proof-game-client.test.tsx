import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HostProofGameClient } from "@/components/host-proof/HostProofGameClient";

const mockDispatch = jest.fn();
const mockResize = jest.fn();
const mockSnapshot = jest.fn(() => ({
  mechanic: { status: "running" },
  inputCounts: { keyboard: 0, pointer: 0, touch: 0 },
  completionCount: 0,
}));
const mockCreateQcSession = jest.fn(() => ({
  dispatch: mockDispatch,
  resize: mockResize,
  snapshot: mockSnapshot,
}));
const mockLoadExistingCoreQcCartridge = jest.fn(async () => ({
  createQcSession: mockCreateQcSession,
}));

jest.mock("@reading-advantage/game-contracts", () => ({
  EXISTING_CORE_HOST_PROOF_BINDINGS: [
    {
      id: "dragon-flight",
      title: "Dragon Flight",
      inputMode: "vocabulary",
      temporalScope: "current-source",
    },
    {
      id: "magic-defense",
      title: "Magic Defense",
      inputMode: "vocabulary",
      temporalScope: "current-source",
    },
  ],
}));

jest.mock("@reading-advantage/game-cartridges/qc", () => ({
  loadExistingCoreQcCartridge: (...args: unknown[]) => mockLoadExistingCoreQcCartridge(...args),
}));

describe("HostProofGameClient", () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    mockResize.mockReset();
    mockSnapshot.mockClear();
    mockCreateQcSession.mockClear();
    mockLoadExistingCoreQcCartridge.mockClear();

    let postCount = 0;
    global.fetch = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("?limit=50")) {
        return { ok: true, status: 200, json: async () => ({ history: [] }) } as Response;
      }

      postCount += 1;
      if (postCount === 1) {
        throw new Error("temporary network failure");
      }

      const payload = JSON.parse(String(init?.body));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          xpEarned: 7,
          activityId: `game:dragon-flight:${payload.idempotencyKey}`,
          duplicate: false,
          status: 200,
          gameType: "dragon-flight",
        }),
      } as Response;
    }) as jest.Mock;
  });

  it("keeps one activity id for retries, creates a new one for replay, and resizes the live session", async () => {
    render(<HostProofGameClient />);

    await screen.findByTestId("host-proof-game-container");
    fireEvent.click(screen.getByTestId("host-proof-primary-button"));

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(mockResize).toHaveBeenCalledWith(
      expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }),
    );

    fireEvent.click(screen.getByTestId("host-proof-complete-button"));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByTestId("host-proof-complete-button"));
    await screen.findByText(/Completed!/);

    const completionRequests = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]) => String(url) === "/api/host-proof/games/completions",
    );
    const retryIds = completionRequests.slice(0, 2).map(([, init]) => JSON.parse(init.body).idempotencyKey);
    expect(retryIds[0]).toBe(retryIds[1]);

    fireEvent.click(screen.getByTestId("host-proof-replay-button"));
    await waitFor(() => expect(mockCreateQcSession).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByTestId("host-proof-primary-button"));
    fireEvent.click(screen.getByTestId("host-proof-complete-button"));
    await screen.findByText(/Completed!/);

    const replayRequest = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]) => String(url) === "/api/host-proof/games/completions",
    )[2];
    expect(JSON.parse(replayRequest[1].body).idempotencyKey).not.toBe(retryIds[0]);
  });

  it("navigates only among the shared accepted bindings", async () => {
    render(<HostProofGameClient />);

    const selector = await screen.findByLabelText("Select host-proof cartridge");
    expect(selector).toHaveValue("dragon-flight");

    fireEvent.click(screen.getByRole("button", { name: "Next host-proof cartridge" }));
    expect(selector).toHaveValue("magic-defense");

    fireEvent.click(screen.getByRole("button", { name: "Previous host-proof cartridge" }));
    expect(selector).toHaveValue("dragon-flight");
  });
});
