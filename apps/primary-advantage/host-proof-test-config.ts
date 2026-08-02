/** Default classroom password used only by the local Primary host-proof fixture. */
export const DEFAULT_HOST_PROOF_TEST_CLASS_CODE = "HOST-PROOF-001";

/** Default username created by the local Primary host-proof fixture. */
export const DEFAULT_HOST_PROOF_TEST_STUDENT_USERNAME = "host-proof-student";

/** Values shared by the Primary host-proof seeder and Playwright authentication setup. */
export interface HostProofTestCredentials {
  /** Classroom password accepted by the test login flow. */
  readonly classCode: string;
  /** Student username created by the test seeder. */
  readonly studentUsername: string;
}

/**
 * Resolves the explicit or default credentials for the local host-proof fixture.
 * @param environment Environment values supplied to the test process.
 * @returns The credentials used by both the seeder and Playwright login setup.
 */
export function getHostProofTestCredentials(
  environment: Partial<Pick<
    NodeJS.ProcessEnv,
    "HOST_PROOF_TEST_CLASS_CODE" | "HOST_PROOF_TEST_STUDENT_USERNAME"
  >> = {
    HOST_PROOF_TEST_CLASS_CODE: process.env.HOST_PROOF_TEST_CLASS_CODE,
    HOST_PROOF_TEST_STUDENT_USERNAME: process.env.HOST_PROOF_TEST_STUDENT_USERNAME,
  },
): HostProofTestCredentials {
  return {
    classCode:
      environment.HOST_PROOF_TEST_CLASS_CODE ??
      DEFAULT_HOST_PROOF_TEST_CLASS_CODE,
    studentUsername:
      environment.HOST_PROOF_TEST_STUDENT_USERNAME ??
      DEFAULT_HOST_PROOF_TEST_STUDENT_USERNAME,
  };
}

/**
 * Builds the dev-server command used for Primary host-proof Playwright proof.
 * @param port Local port selected by the Playwright configuration.
 * @returns A command that enables the otherwise-hidden host-proof surface.
 */
export function createHostProofPlaywrightWebServerCommand(port: number): string {
  return `pnpm --filter @reading-advantage/domain build && pnpm --filter @reading-advantage/advantage-play-kit build && pnpm --filter @reading-advantage/game-cartridges build && pnpm --filter @reading-advantage/db migrate && pnpm exec tsx scripts/seed-host-proof-session.ts && NEXT_DIST_DIR=.next/host-proof-${port} HOST_PROOF_ENABLED=true HOST_PROOF_ATTEMPT_SECRET=host-proof-local-attempt-secret-2026 HOST_PROOF_TEST_GATE_TO_LAUNCH_DWELL_MS=3000 PORT=${port} npm run dev`;
}
