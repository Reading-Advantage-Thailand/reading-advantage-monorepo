import "server-only";

/**
 * Reports whether the hidden Task-5 host-proof surface is explicitly enabled.
 * @returns True only when the server-side feature flag is exactly `"true"`.
 */
export function isHostProofEnabled(): boolean {
  return process.env.HOST_PROOF_ENABLED === "true";
}
