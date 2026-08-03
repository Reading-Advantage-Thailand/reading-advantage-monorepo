import "server-only";

/**
 * Reports whether the dual-host host-proof surface is enabled for this process.
 * True when HOST_PROOF_ENABLED or HOST_PROOF_PRODUCTION_CUTOVER is exactly "true"
 * (product-owner option-1 production cutover authorization).
 * @returns Whether host-proof routes should render.
 */
export function isHostProofEnabled(): boolean {
  return (
    process.env.HOST_PROOF_ENABLED === "true" ||
    process.env.HOST_PROOF_PRODUCTION_CUTOVER === "true"
  );
}
