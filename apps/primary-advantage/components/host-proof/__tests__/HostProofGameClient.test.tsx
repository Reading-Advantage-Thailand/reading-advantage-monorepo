/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HostProofGameClient } from "../HostProofGameClient";

const mockResize = vi.fn();
const mockDispatch = vi.fn();
const mockSnapshot = vi.fn();
const mockCreateQcSession = vi.fn();

const fakeSession = {
  dispatch: (...dispatchArgs: unknown[]) => {
    mockDispatch(...dispatchArgs);
  },
  resize: (...resizeArgs: unknown[]) => {
    mockResize(...resizeArgs);
    const viewport = resizeArgs[0] as { width: number };
    return { supported: true, profile: viewport.width >= 800 ? "wide" : "compact" };
  },
  snapshot: () =>
    mockSnapshot() ?? {
      mechanic: { attempts: 0 },
      inputCounts: { keyboard: 0, pointer: 0, touch: 0 },
      completionCount: 0,
      profile: "wide",
    },
};

const fakeCartridge = {
  createQcSession: (...args: unknown[]) => {
    mockCreateQcSession(...args);
    return fakeSession;
  },
};

vi.mock("@reading-advantage/game-cartridges/qc", () => ({
  loadExistingCoreQcCartridge: vi.fn(async (id: string) => {
    if (
      !["dragon-flight", "magic-defense", "dungeon-liberator", "sorcerer-ziggurat", "astral-mage"].includes(id)
    ) {
      throw new Error(`Unknown cartridge ${id}`);
    }
    return fakeCartridge;
  }),
}));

describe("HostProofGameClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockResize.mockClear();
    mockDispatch.mockClear();
    mockSnapshot.mockClear();
    mockCreateQcSession.mockClear();
    mockSnapshot.mockReturnValue({
      mechanic: { attempts: 0 },
      inputCounts: { keyboard: 0, pointer: 0, touch: 0 },
      completionCount: 0,
      profile: "wide",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls session.resize on mount and preserves profile across cartridge switches", async () => {
    Object.defineProperty(window, "innerWidth", { value: 1280, writable: true, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 0, writable: true, configurable: true });

    render(<HostProofGameClient />);

    await waitFor(() => {
      expect(screen.getByTestId("host-proof-profile")).toHaveTextContent("wide");
    });

    expect(mockResize).toHaveBeenCalledWith({ width: 1280, height: 1 });

    const select = screen.getByLabelText("Select host-proof cartridge");
    fireEvent.change(select, { target: { value: "magic-defense" } });

    await waitFor(() => {
      expect(screen.getByTestId("host-proof-profile")).toHaveTextContent("wide");
    });

    expect(mockCreateQcSession).toHaveBeenCalledTimes(2);
  });

  it("preserves the active session when the selected cartridge is reselected", async () => {
    render(<HostProofGameClient />);

    const container = await screen.findByTestId("host-proof-game-container");
    const select = screen.getByLabelText("Select host-proof cartridge");
    expect(container).toHaveAttribute("data-cartridge-id", "dragon-flight");
    expect(mockCreateQcSession).toHaveBeenCalledTimes(1);

    fireEvent.change(select, { target: { value: "dragon-flight" } });

    expect(screen.getByTestId("host-proof-game-container")).toHaveAttribute("data-cartridge-id", "dragon-flight");
    expect(mockCreateQcSession).toHaveBeenCalledTimes(1);
  });

  it("uses the shared QC composition at the 768px compact/wide boundary", async () => {
    Object.defineProperty(window, "innerWidth", { value: 768, writable: true, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });

    render(<HostProofGameClient />);

    await waitFor(() => {
      expect(screen.getByTestId("host-proof-profile")).toHaveTextContent("compact");
    });
  });

  it("only imports the QC loader through a dynamic import", () => {
    const componentSource = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "..", "HostProofGameClient.tsx"),
      "utf-8",
    );

    const staticImport = /import\s+.*\s+from\s+["']@reading-advantage\/game-cartridges\/qc["']/.test(componentSource);
    const dynamicImport = /import\s*\(\s*["']@reading-advantage\/game-cartridges\/qc["']\s*\)/.test(componentSource);

    expect(staticImport).toBe(false);
    expect(dynamicImport).toBe(true);
  });
  it("reuses an attempt id for retries, creates one on replay, and navigates accepted bindings", async () => {
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      if (String(input).includes("?limit=50")) {
        return { ok: true, status: 200, json: async () => ({ history: [] }) } as Response;
      }

      const completionRequests = fetchMock.mock.calls.filter(
        ([url]) => String(url) === "/api/host-proof/games/completions",
      );
      if (completionRequests.length === 1) {
        throw new Error("temporary network failure");
      }

      const payload = JSON.parse(String(init?.body)) as { idempotencyKey: string };
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
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HostProofGameClient />);
    await screen.findByTestId("host-proof-game-container");
    fireEvent.click(screen.getByTestId("host-proof-primary-button"));

    fireEvent.click(screen.getByTestId("host-proof-complete-button"));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByTestId("host-proof-complete-button"));
    await screen.findByText(/Completed!/);

    const retryRequestIds = fetchMock.mock.calls
      .filter(([url]) => String(url) === "/api/host-proof/games/completions")
      .slice(0, 2)
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)).idempotencyKey);
    expect(retryRequestIds[0]).toBe(retryRequestIds[1]);


    const sessionsBeforeReplay = mockCreateQcSession.mock.calls.length;
    fireEvent.click(screen.getByTestId("host-proof-replay-button"));
    await waitFor(() => expect(mockCreateQcSession.mock.calls.length).toBeGreaterThan(sessionsBeforeReplay));
    await screen.findByTestId("host-proof-game-container");
    fireEvent.click(screen.getByTestId("host-proof-primary-button"));
    fireEvent.click(screen.getByTestId("host-proof-complete-button"));
    await screen.findByText(/Completed!/);

    const replayRequest = fetchMock.mock.calls.filter(
      ([url]) => String(url) === "/api/host-proof/games/completions",
    )[2];
    expect(JSON.parse(String((replayRequest[1] as RequestInit).body)).idempotencyKey).not.toBe(retryRequestIds[0]);

    fireEvent.click(screen.getByRole("button", { name: "Next host-proof cartridge" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Select host-proof cartridge")).toHaveValue("magic-defense"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("host-proof-game-container")).toHaveAttribute("data-cartridge-id", "magic-defense"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Previous host-proof cartridge" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Select host-proof cartridge")).toHaveValue("dragon-flight"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("host-proof-game-container")).toHaveAttribute("data-cartridge-id", "dragon-flight"),
    );
  }, 15_000);
});
