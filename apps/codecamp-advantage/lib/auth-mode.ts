/** Explicit Codecamp authentication modes; company mode is the safe default. */
export type CodecampAuthMode = "company" | "legacy";

/**
 * Resolves the operator-selected Codecamp authentication mode.
 * @param environment Runtime environment containing the optional mode switch.
 * @returns Validated company or legacy mode.
 * @throws When CODECAMP_AUTH_MODE is present but is not an exact supported value.
 */
export function getCodecampAuthMode(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): CodecampAuthMode {
  const configured = environment.CODECAMP_AUTH_MODE;
  if (configured === undefined) return "company";
  if (configured !== "company" && configured !== "legacy") {
    throw new Error("CODECAMP_AUTH_MODE must be company or legacy.");
  }
  return configured;
}

/**
 * Reports whether the operator explicitly enabled the recoverability-only legacy adapter.
 * @param environment Runtime environment containing the optional mode switch.
 * @returns Whether product-local credential and session adapters are enabled.
 */
export function isLegacyCodecampAuthEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return getCodecampAuthMode(environment) === "legacy";
}
