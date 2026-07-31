import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("host-proof server configuration", () => {
  const originalHostProofEnabled = process.env.HOST_PROOF_ENABLED;

  afterEach(() => {
    process.env.HOST_PROOF_ENABLED = originalHostProofEnabled;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("fails closed when the flag is absent, including production", async () => {
    delete process.env.HOST_PROOF_ENABLED;
    vi.stubEnv("NODE_ENV", "production");

    const { isHostProofEnabled } = await import("../host-proof-config");

    expect(isHostProofEnabled()).toBe(false);
  });

  it("enables the guarded proof surface only for an explicit true flag", async () => {
    process.env.HOST_PROOF_ENABLED = "true";

    const { isHostProofEnabled } = await import("../host-proof-config");

    expect(isHostProofEnabled()).toBe(true);
  });

  it.each(["TRUE", "1", "yes", "false", ""])("does not treat %s as enabled", async (value) => {
    process.env.HOST_PROOF_ENABLED = value;

    const { isHostProofEnabled } = await import("../host-proof-config");

    expect(isHostProofEnabled()).toBe(false);
  });
});
