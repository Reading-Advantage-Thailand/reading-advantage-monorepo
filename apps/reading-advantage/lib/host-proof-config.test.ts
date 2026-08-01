/**
 * @jest-environment node
 */

describe("host-proof server configuration", () => {
  const originalHostProofEnabled = process.env.HOST_PROOF_ENABLED;

  afterEach(() => {
    process.env.HOST_PROOF_ENABLED = originalHostProofEnabled;
    jest.resetModules();
  });

  it("fails closed when the flag is absent", async () => {
    delete process.env.HOST_PROOF_ENABLED;

    const { isHostProofEnabled } = await import("./host-proof-config");

    expect(isHostProofEnabled()).toBe(false);
  });

  it("enables the guarded proof surface only for an explicit true flag", async () => {
    process.env.HOST_PROOF_ENABLED = "true";

    const { isHostProofEnabled } = await import("./host-proof-config");

    expect(isHostProofEnabled()).toBe(true);
  });

  it.each(["TRUE", "1", "yes", "false", ""]) (
    "does not treat %p as enabled",
    async (value) => {
      process.env.HOST_PROOF_ENABLED = value;

      const { isHostProofEnabled } = await import("./host-proof-config");

      expect(isHostProofEnabled()).toBe(false);
    },
  );
});
