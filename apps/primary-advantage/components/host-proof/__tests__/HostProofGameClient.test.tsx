/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
    return { supported: true, profile: "wide" };
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

    render(<HostProofGameClient />);

    await waitFor(() => {
      expect(screen.getByTestId("host-proof-profile")).toHaveTextContent("wide");
    });

    expect(mockResize).toHaveBeenCalledWith(expect.objectContaining({ width: 1280 }));

    const select = screen.getByLabelText("Select host-proof cartridge");
    fireEvent.change(select, { target: { value: "magic-defense" } });

    await waitFor(() => {
      expect(screen.getByTestId("host-proof-profile")).toHaveTextContent("wide");
    });

    expect(mockCreateQcSession).toHaveBeenCalledTimes(2);
  });

  it("only imports the QC loader through a dynamic import", () => {
    const componentSource = readFileSync(
      resolve(process.cwd(), "components/host-proof/HostProofGameClient.tsx"),
      "utf-8",
    );

    const staticImport = /import\s+.*\s+from\s+["']@reading-advantage\/game-cartridges\/qc["']/.test(componentSource);
    const dynamicImport = /import\s*\(\s*["']@reading-advantage\/game-cartridges\/qc["']\s*\)/.test(componentSource);

    expect(staticImport).toBe(false);
    expect(dynamicImport).toBe(true);
  });
});
