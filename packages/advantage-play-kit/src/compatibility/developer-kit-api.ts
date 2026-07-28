/**
 * Versioned developer-kit API and compatibility plan bound to the accepted
 * canonical standard-pack release, resolver schema, selected-union contract,
 * attribution contract, immutable T10 evidence, and owner-authorized forward product bindings.
 *
 * Future cartridge cohort tracks pin this compatibility report to ensure their
 * scaffold defaults bind the accepted 2026.07.23 release and fail closed for invalid configuration.
 */

import {
  ACCEPTED_CAPABILITY_IDS,
  ACCEPTED_T10_INPUTS,
  BLOCKED_SCOPES,
} from "../systems/capability-manifest.js";
import { ACCEPTED_STANDARD_ASSET_RELEASE } from "../assets/accepted-standard-pack-release.js";
import { OWNER_APPROVED_CANONICAL_BINDINGS } from "../assets/semantic-product-bindings.js";

/** Owner-authorized developer-kit API contract version; distinct from package distribution version 0.1.0. */
export const DEVELOPER_KIT_API_VERSION = "2.0.0";

/** Frozen compatibility plan for the accepted developer-kit API surface. */
export interface DeveloperKitCompatibility {
  /** Developer-kit API version. */
  readonly apiVersion: string;
  /** Track that published this compatibility plan. */
  readonly trackId: "apk_shared_developer_kit_20260712";
  /** Accepted canonical standard-pack release version. */
  readonly standardPackReleaseVersion: string;
  /** Accepted catalog digest. */
  readonly standardPackCatalogDigest: string;
  /** Accepted source-receipt digest. */
  readonly standardPackSourceReceiptDigest: string;
  /** The seven accepted capability ids. */
  readonly acceptedCapabilityIds: readonly string[];
  /** Number of approved asset mappings (zero by T10 boundary). */
  readonly approvedAssetMappings: number;
  /** Number of blocked asset mappings pending approval. */
  readonly blockedAssetMappings: number;
  /** Blocked T11 scopes that must fail closed. */
  readonly blockedScopes: typeof BLOCKED_SCOPES;
  /** T10 evidence disposition retained as history rather than forward product policy. */
  readonly historicalT10Boundary: {
    readonly acceptedRuntimeContracts: 0;
    readonly approvedAssetMappings: 0;
    readonly blockedAssetMappings: 85;
    readonly blockedResponsiveCells: 5664;
  };
  /** Forward scopes implemented under the owner-authorized extension. */
  readonly supportedForwardScopes: readonly ["runtime", "responsive", "presentation", "semantic-assets", "qc", "scaffolding"];
  /** Owner-approved forward product bindings that make no legacy-evidence claim. */
  readonly ownerApprovedProductBindings: number;
  /** Required attribution text. */
  readonly requiredCredit: string;
  /** The only resolver entry point permitted for downstream cartridges. */
  readonly resolverEntry: "createAcceptedStandardAssetResolver";
  /** The selected-union materializer contract. */
  readonly selectedUnionContract: "materializeStandardAssetUnion";
  /** Patterns explicitly forbidden by the developer-kit boundary. */
  readonly forbiddenPatterns: readonly string[];
}

/** Frozen compatibility plan bound to the exact accepted release. */
export const DEVELOPER_KIT_COMPATIBILITY: DeveloperKitCompatibility = Object.freeze({
  apiVersion: DEVELOPER_KIT_API_VERSION,
  trackId: "apk_shared_developer_kit_20260712",
  standardPackReleaseVersion: ACCEPTED_T10_INPUTS.standardPackReleaseVersion,
  standardPackCatalogDigest: ACCEPTED_T10_INPUTS.standardPackCatalogDigest,
  standardPackSourceReceiptDigest: ACCEPTED_T10_INPUTS.standardPackSourceReceiptDigest,
  acceptedCapabilityIds: ACCEPTED_CAPABILITY_IDS,
  approvedAssetMappings: ACCEPTED_T10_INPUTS.approvedAssetMappings,
  blockedAssetMappings: ACCEPTED_T10_INPUTS.blockedAssetMappings,
  blockedScopes: BLOCKED_SCOPES,
  historicalT10Boundary: Object.freeze({
    acceptedRuntimeContracts: 0,
    approvedAssetMappings: 0,
    blockedAssetMappings: 85,
    blockedResponsiveCells: 5664,
  }),
  supportedForwardScopes: Object.freeze(["runtime", "responsive", "presentation", "semantic-assets", "qc", "scaffolding"] as const),
  ownerApprovedProductBindings: OWNER_APPROVED_CANONICAL_BINDINGS.bindings.length,
  requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit,
  resolverEntry: "createAcceptedStandardAssetResolver",
  selectedUnionContract: "materializeStandardAssetUnion",
  forbiddenPatterns: Object.freeze([
    "Direct physical asset imports are prohibited; cartridges request semantic keys only",
    "Edition and theme asset bindings are prohibited; the 75-file dual-pack ABI is retired",
    "Copied pack trees and private pack trees are prohibited",
    "Unpinned standard-pack releases are prohibited; cartridges must pin the accepted 2026.07.23 release",
    "Missing attribution registration is prohibited; the ElvGames credit is required",
    "Title-specific shared APIs are prohibited; systems expose bounded configuration only",
    "Procedural or placeholder art is prohibited from satisfying production readiness",
  ]),
});

/** Frozen compatibility report for downstream cohort tracks. */
export interface DeveloperKitCompatibilityReport {
  readonly apiVersion: string;
  readonly trackId: "apk_shared_developer_kit_20260712";
  readonly standardPackReleaseVersion: string;
  readonly resolverContract: "createAcceptedStandardAssetResolver";
  readonly selectedUnionContract: "materializeStandardAssetUnion";
  readonly attributionContract: string;
  readonly acceptedCapabilityIds: readonly string[];
  readonly approvedAssetMappings: number;
  readonly blockedAssetMappings: number;
  readonly blockedScopes: typeof BLOCKED_SCOPES;
  readonly historicalT10Boundary: DeveloperKitCompatibility["historicalT10Boundary"];
  readonly supportedForwardScopes: DeveloperKitCompatibility["supportedForwardScopes"];
  readonly ownerApprovedProductBindings: number;
  readonly forbiddenPatterns: readonly string[];
}

/**
 * Builds a frozen compatibility report for downstream cohort tracks.
 * @returns An immutable report pinning the accepted release, resolver, selected-union, attribution, and blocked scopes.
 */
export function buildDeveloperKitCompatibilityReport(): DeveloperKitCompatibilityReport {
  return Object.freeze({
    apiVersion: DEVELOPER_KIT_COMPATIBILITY.apiVersion,
    trackId: DEVELOPER_KIT_COMPATIBILITY.trackId,
    standardPackReleaseVersion: DEVELOPER_KIT_COMPATIBILITY.standardPackReleaseVersion,
    resolverContract: DEVELOPER_KIT_COMPATIBILITY.resolverEntry,
    selectedUnionContract: DEVELOPER_KIT_COMPATIBILITY.selectedUnionContract,
    attributionContract: DEVELOPER_KIT_COMPATIBILITY.requiredCredit,
    acceptedCapabilityIds: DEVELOPER_KIT_COMPATIBILITY.acceptedCapabilityIds,
    approvedAssetMappings: DEVELOPER_KIT_COMPATIBILITY.approvedAssetMappings,
    blockedAssetMappings: DEVELOPER_KIT_COMPATIBILITY.blockedAssetMappings,
    blockedScopes: DEVELOPER_KIT_COMPATIBILITY.blockedScopes,
    historicalT10Boundary: DEVELOPER_KIT_COMPATIBILITY.historicalT10Boundary,
    supportedForwardScopes: DEVELOPER_KIT_COMPATIBILITY.supportedForwardScopes,
    ownerApprovedProductBindings: DEVELOPER_KIT_COMPATIBILITY.ownerApprovedProductBindings,
    forbiddenPatterns: DEVELOPER_KIT_COMPATIBILITY.forbiddenPatterns,
  });
}
