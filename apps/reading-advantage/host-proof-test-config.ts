/** Default username created by the local Reading host-proof fixture. */
export const DEFAULT_HOST_PROOF_TEST_USERNAME = "host-proof-reading-student";

/** Default password used only by the local Reading host-proof fixture. */
export const DEFAULT_HOST_PROOF_TEST_PASSWORD = "HOST-PROOF-001";

/** Values shared by the Reading host-proof seeder and Playwright setup. */
export interface HostProofTestCredentials {
  /** Username created by the fixture. */
  readonly username: string;
  /** Password accepted by the fixture login flow. */
  readonly password: string;
}

/**
 * Resolves explicit or default credentials for the local host-proof fixture.
 * @param environment Environment values supplied to the test process.
 * @returns Credentials used by the seeder and Playwright authentication setup.
 */
export function getHostProofTestCredentials(
  environment: Partial<Pick<NodeJS.ProcessEnv, "HOST_PROOF_TEST_USERNAME" | "HOST_PROOF_TEST_PASSWORD">> = {
    HOST_PROOF_TEST_USERNAME: process.env.HOST_PROOF_TEST_USERNAME,
    HOST_PROOF_TEST_PASSWORD: process.env.HOST_PROOF_TEST_PASSWORD,
  },
): HostProofTestCredentials {
  return {
    username: environment.HOST_PROOF_TEST_USERNAME ?? DEFAULT_HOST_PROOF_TEST_USERNAME,
    password: environment.HOST_PROOF_TEST_PASSWORD ?? DEFAULT_HOST_PROOF_TEST_PASSWORD,
  };
}

/**
 * Builds the server command used for Reading host-proof Playwright proof.
 * @param port Local port selected by the Playwright configuration.
 * @returns A command that seeds the fixture and enables the hidden surface.
 */
export function createHostProofPlaywrightWebServerCommand(port: number): string {
  return `pnpm --filter @reading-advantage/game-contracts build && pnpm --filter @reading-advantage/advantage-play-kit build && pnpm --filter @reading-advantage/game-cartridges build && pnpm --filter @reading-advantage/domain build && pnpm --filter @reading-advantage/db migrate && pnpm exec tsx scripts/seed-host-proof-session.ts && NEXT_DIST_DIR=.next/host-proof-${port} HOST_PROOF_ENABLED=true HOST_PROOF_ATTEMPT_SECRET=host-proof-local-attempt-secret-2026 HOST_PROOF_TEST_GATE_TO_LAUNCH_DWELL_MS=3000 PORT=${port} npm run dev`;
}
