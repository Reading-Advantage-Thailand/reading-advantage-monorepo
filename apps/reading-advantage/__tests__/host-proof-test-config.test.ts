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
    const migrateCommand = "pnpm --filter @reading-advantage/db migrate";

    expect(command).toContain("scripts/seed-host-proof-session.ts");
    expect(command).toContain(migrateCommand);
    expect(command.indexOf(migrateCommand)).toBeLessThan(
      command.indexOf("pnpm exec tsx scripts/seed-host-proof-session.ts"),
    );
    expect(command).toContain("NEXT_DIST_DIR=.next/host-proof-3107");
    expect(command).toContain("HOST_PROOF_ENABLED=true");
    expect(command).toContain("HOST_PROOF_ATTEMPT_SECRET=host-proof-local-attempt-secret-2026");
    // Dependency build order: contracts → kit → cartridges → domain
    expect(command).toContain("pnpm --filter @reading-advantage/game-contracts build");
    expect(command).toContain("pnpm --filter @reading-advantage/advantage-play-kit build");
    expect(command).toContain("pnpm --filter @reading-advantage/game-cartridges build");
    expect(command).toContain("pnpm --filter @reading-advantage/domain build");
    expect(command.indexOf("pnpm --filter @reading-advantage/game-contracts build")).toBeLessThan(
      command.indexOf("pnpm --filter @reading-advantage/advantage-play-kit build"),
    );
    expect(command.indexOf("pnpm --filter @reading-advantage/advantage-play-kit build")).toBeLessThan(
      command.indexOf("pnpm --filter @reading-advantage/game-cartridges build"),
    );
    expect(command.indexOf("pnpm --filter @reading-advantage/game-cartridges build")).toBeLessThan(
      command.indexOf("pnpm --filter @reading-advantage/domain build"),
    );
    expect(command).toContain("PORT=3107");
  });
});
