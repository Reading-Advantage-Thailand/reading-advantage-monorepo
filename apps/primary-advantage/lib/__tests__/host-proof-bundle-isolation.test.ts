// @vitest-environment node
/**
 * Behavioral replacement for the static host-proof bundle-isolation grep
 * tests.
 *
 * Instead of matching import statements in source text, these tests assert
 * on the live module graph: importing the server modules (and statically
 * importing the client component) must not evaluate the QC cartridge
 * loader. The loader mock records its own evaluation, so a static import
 * anywhere in the chain would trip the flag at import time. The client
 * only reaches the loader through a dynamic `import()` inside its load
 * effect, which the HostProofGameClient render tests exercise.
 */
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ qcEvaluated: false }));

vi.mock("@reading-advantage/game-cartridges/qc", () => {
  state.qcEvaluated = true;
  return { loadExistingCoreQcCartridge: vi.fn() };
});

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@reading-advantage/domain/games", () => ({
  HostProofCompletionError: class HostProofCompletionError extends Error {},
  hostProofErrorHttpStatus: () => 500,
  recordHostProofGameCompletion: vi.fn(),
  getHostProofGameCompletions: vi.fn(),
}));

vi.mock("@reading-advantage/domain", () => ({
  createTenantDB: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({
  db: {},
}));

vi.mock("@/lib/host-proof-config", () => ({
  isHostProofEnabled: () => true,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
}));

import {
  GET,
  POST,
} from "@/app/api/host-proof/games/completions/route";
import HostProofLayout from "@/app/[locale]/(host-proof)/layout";
import HostProofGamesPage from "@/app/[locale]/(host-proof)/student/host-proof/games/page";
import { HostProofGameClient } from "@/components/host-proof/HostProofGameClient";

describe("host-proof bundle isolation", () => {
  it("imports the server surface without evaluating the QC loader", () => {
    expect(GET).toBeTypeOf("function");
    expect(POST).toBeTypeOf("function");
    expect(HostProofLayout).toBeTypeOf("function");
    expect(HostProofGamesPage).toBeTypeOf("function");
    expect(state.qcEvaluated).toBe(false);
  });

  it("statically imports the client component without evaluating the QC loader", () => {
    expect(HostProofGameClient).toBeTypeOf("function");
    expect(state.qcEvaluated).toBe(false);
  });

  it("reaches the QC loader through a dynamic import", async () => {
    const qc = await import("@reading-advantage/game-cartridges/qc");

    expect(state.qcEvaluated).toBe(true);
    expect(qc.loadExistingCoreQcCartridge).toBeTypeOf("function");
  });
});
