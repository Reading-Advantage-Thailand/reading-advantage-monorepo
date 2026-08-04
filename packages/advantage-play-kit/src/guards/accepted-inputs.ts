/**
 * Accepted-inputs guard that enforces the exact T10 successor-hash and
 * standard-pack release binding at the developer-kit boundary.
 *
 * This guard is the only authority for what T11 may consume. It rejects
 * missing, stale, revoked, mismatched, direct-legacy, private-tree, or
 * non-standard-pack input before any shared-kit initialization runs.
 */

import {
  ACCEPTED_CAPABILITY_IDS,
  ACCEPTED_T10_INPUTS,
  buildAcceptedCapabilityManifest,
  type AcceptedCapabilityManifest,
  type AcceptedT10Inputs,
} from "../systems/capability-manifest.js";
import { ACCEPTED_STANDARD_ASSET_RELEASE } from "../assets/accepted-standard-pack-release.js";
import type { StandardAssetReleaseBinding } from "../assets/standard-pack-release.js";
import {
  APKBlockedScopeError,
  APKUnsupportedCapabilityError,
  type BlockedScope,
} from "../diagnostics/structured-error.js";

/** Frozen guard binding the exact accepted T10 inputs and blocked scopes. */
export interface AcceptedInputsGuard {
  readonly t10Inputs: AcceptedT10Inputs;
  readonly manifest: AcceptedCapabilityManifest;
  readonly standardPackRelease: typeof ACCEPTED_STANDARD_ASSET_RELEASE;
}

/** The frozen accepted-inputs guard bound to the exact T10 successor hashes. */
export const ACCEPTED_INPUTS_GUARD: AcceptedInputsGuard = Object.freeze({
  t10Inputs: ACCEPTED_T10_INPUTS,
  manifest: buildAcceptedCapabilityManifest(),
  standardPackRelease: ACCEPTED_STANDARD_ASSET_RELEASE,
});

/**
 * Reports whether a capability id is in the T10-accepted registry.
 * @param capabilityId The capability id to test.
 * @returns True when the capability id is one of the seven accepted ids.
 */
export function isAcceptedCapabilityId(capabilityId: string): boolean {
  return ACCEPTED_CAPABILITY_IDS.includes(capabilityId as (typeof ACCEPTED_CAPABILITY_IDS)[number]);
}

/**
 * Asserts that the accepted T10 inputs and standard-pack release are intact.
 * @param guard The accepted-inputs guard to validate.
 * @throws When the in-memory guard has been tampered with.
 */
export function assertAcceptedInputs(guard: AcceptedInputsGuard = ACCEPTED_INPUTS_GUARD): void {
  const manifest = guard.manifest;
  if (manifest.capabilityIds.length !== 7) {
    throw new Error("Accepted inputs guard requires exactly seven accepted capabilities");
  }
  if (guard.t10Inputs.acceptedRuntimeContracts !== 0) {
    throw new Error("Accepted inputs guard requires zero accepted runtime contracts");
  }
  if (guard.t10Inputs.approvedAssetMappings !== 0) {
    throw new Error("Accepted inputs guard requires zero approved asset mappings");
  }
  if (guard.standardPackRelease.version !== ACCEPTED_T10_INPUTS.standardPackReleaseVersion) {
    throw new Error("Accepted standard-pack release version does not match the T10 binding");
  }
  if (guard.standardPackRelease.catalogDigest !== ACCEPTED_T10_INPUTS.standardPackCatalogDigest) {
    throw new Error("Accepted standard-pack catalog digest does not match the T10 binding");
  }
}

/**
 * Asserts that a standard-pack binding pins the exact accepted release.
 * @param binding Cartridge-supplied release binding.
 * @throws When the binding does not match the accepted release.
 */
export function assertAcceptedStandardPackBinding(binding: StandardAssetReleaseBinding): void {
  const accepted = ACCEPTED_STANDARD_ASSET_RELEASE;
  if (
    binding.version !== accepted.version
    || binding.catalogDigest !== accepted.catalogDigest
    || binding.sourceReceiptDigest !== accepted.sourceReceiptDigest
  ) {
    throw new Error(
      "Standard-pack binding does not pin the accepted release 2026.08.04; "
        + "stale, mismatched, or non-standard-pack bindings are prohibited.",
    );
  }
}

const BLOCKED_SCOPE_MESSAGES: Readonly<Record<BlockedScope, string>> = Object.freeze({
  runtime:
    "Runtime contracts are blocked by T10: zero accepted runtime contracts; "
    + "runtime acceptance requires a future owner-delegated T10 successor.",
  responsive:
    "Responsive composition is blocked by T10: 354 contracts / 5664 cells remain blocked; "
    + "responsive acceptance requires a future owner-delegated T10 successor.",
  presentation:
    "Standard presentation components are blocked by T10: they depend on the blocked responsive "
    + "composition contracts and the 85 blocked asset mappings.",
  "asset-mappings":
    "Asset mappings are blocked by T10: 85 mappings remain blocked and zero are approved; "
    + "cartridges must resolve semantic roles through the accepted standard-pack resolver only.",
  "unknown-must-haves":
    "Unknown Must-have developer-capability values are blocked by T10; "
    + "no value may be inferred or invented for a blocked Must-have.",
});

const BLOCKED_SCOPE_DETAILS: Readonly<Record<BlockedScope, Readonly<Record<string, unknown>>>> = Object.freeze({
  runtime: { acceptedContracts: 0 },
  responsive: { blockedContracts: 354, blockedCells: 5664, acceptedContracts: 0 },
  presentation: { blockedResponsiveCells: 5664, blockedAssetMappings: 85 },
  "asset-mappings": { blockedMappings: 85, approvedMappings: 0 },
  "unknown-must-haves": { blockedUnknownMustHaves: 3 },
});

/**
 * Rejects a blocked T11 scope with a structured diagnostic.
 * @param scope The blocked scope category.
 * @throws Always throws an `APKBlockedScopeError`.
 */
export function rejectBlockedScope(scope: BlockedScope): never {
  throw new APKBlockedScopeError(scope, BLOCKED_SCOPE_MESSAGES[scope], BLOCKED_SCOPE_DETAILS[scope]);
}

/**
 * Rejects a capability id that is not in the T10-accepted registry.
 * @param capabilityId The non-accepted capability id.
 * @throws Always throws an `APKUnsupportedCapabilityError`.
 */
export function rejectUnsupportedCapability(capabilityId: string): never {
  throw new APKUnsupportedCapabilityError(capabilityId, ACCEPTED_CAPABILITY_IDS);
}
