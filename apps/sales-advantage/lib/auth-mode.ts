/** Explicit Sales authentication modes; company mode is the production default. */
export type SalesAuthMode = "company" | "legacy-school";

/**
 * Resolves the explicit Sales authentication mode without ambient fallback.
 * @param environment Runtime environment containing the optional mode switch.
 * @returns Validated company or legacy-school mode.
 * @throws When SALES_AUTH_MODE contains an unsupported value.
 */
export function getSalesAuthMode(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SalesAuthMode {
  const mode = environment.SALES_AUTH_MODE?.trim() || "company";
  if (mode !== "company" && mode !== "legacy-school") {
    throw new Error("SALES_AUTH_MODE must be company or legacy-school.");
  }
  return mode;
}

/**
 * Reports whether the operator explicitly enabled the recoverability-only legacy path.
 * @param environment Runtime environment containing the optional mode switch.
 * @returns Whether legacy school sessions are explicitly enabled.
 */
export function isLegacySalesAuthEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return getSalesAuthMode(environment) === "legacy-school";
}
