/** Accepted T10 inputs and successor-hash binding guard. */
export {
  ACCEPTED_INPUTS_GUARD,
  assertAcceptedInputs,
  assertAcceptedStandardPackBinding,
  isAcceptedCapabilityId,
  rejectBlockedScope,
  rejectUnsupportedCapability,
} from "./accepted-inputs.js";
export type { AcceptedInputsGuard } from "./accepted-inputs.js";

/** Fail-closed guards for blocked responsive and presentation scopes (deprecated bounded-only historical surface). */
/**
 * @deprecated Use the public runtime/responsive/presentation modules directly.
 * These guards are retained as bounded-only historical evidence.
 */
export {
  assertPresentationBlocked,
  assertResponsiveCompositionBlocked,
  createResponsiveCompositionGuard,
  PRESENTATION_BLOCKED_DIAGNOSTIC,
  RESPONSIVE_BLOCKED_DIAGNOSTIC,
} from "./blocked-scopes.js";
export type {
  ResponsiveBlockedDiagnostic,
  ViewportDimensions,
} from "./blocked-scopes.js";

/** Legacy dual-pack ABI retirement policy. */
export {
  EDITIONS_MODULE_PATH,
  EDITIONS_POLICY,
  isEditionsModulePath,
  LEGACY_EDITION_POLICY_DIAGNOSTIC,
} from "./legacy-edition-policy.js";
export type {
  LegacyEditionPolicy,
  LegacyEditionPolicyDiagnostic,
} from "./legacy-edition-policy.js";
