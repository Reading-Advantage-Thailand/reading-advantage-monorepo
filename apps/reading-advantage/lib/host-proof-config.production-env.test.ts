/**
 * @jest-environment node
 */

describe("host-proof server configuration in a production-like environment", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("fails closed when the explicit flag is absent", async () => {
    const productionLikeEnvironment: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: "production",
    };
    delete productionLikeEnvironment.HOST_PROOF_ENABLED;
    jest.replaceProperty(process, "env", productionLikeEnvironment);

    const { isHostProofEnabled } = await import("./host-proof-config");

    expect(isHostProofEnabled()).toBe(false);
  });
});
