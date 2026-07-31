import {
  DEFAULT_HOST_PROOF_TEST_PASSWORD,
  DEFAULT_HOST_PROOF_TEST_USERNAME,
  createHostProofPlaywrightWebServerCommand,
  getHostProofTestCredentials,
} from "../host-proof-test-config";

describe("Reading host-proof test configuration", () => {
  it("provides deterministic defaults and honors explicit overrides", () => {
    expect(getHostProofTestCredentials({})).toEqual({
      username: DEFAULT_HOST_PROOF_TEST_USERNAME,
      password: DEFAULT_HOST_PROOF_TEST_PASSWORD,
    });
    expect(
      getHostProofTestCredentials({
        HOST_PROOF_TEST_USERNAME: "custom-student",
        HOST_PROOF_TEST_PASSWORD: "custom-password",
      }),
    ).toEqual({ username: "custom-student", password: "custom-password" });
  });

  it("seeds before starting an isolated flagged server", () => {
    const command = createHostProofPlaywrightWebServerCommand(3107);

    expect(command).toContain("scripts/seed-host-proof-session.ts");
    expect(command).toContain("NEXT_DIST_DIR=.next/host-proof-3107");
    expect(command).toContain("HOST_PROOF_ENABLED=true");
    expect(command).toContain("PORT=3107");
  });
});
