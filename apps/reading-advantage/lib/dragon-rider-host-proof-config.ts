import "server-only";

/** Reports whether the isolated Dragon Rider host proof is explicitly enabled. */
export function isDragonRiderHostProofEnabled(): boolean { return process.env.DRAGON_RIDER_HOST_PROOF_ENABLED === "true"; }
