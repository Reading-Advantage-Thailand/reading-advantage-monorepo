import {
  createStandardAssetResolver,
  serializeStandardAssetCatalogPayload,
  STANDARD_ASSET_REQUIRED_CREDIT,
} from "./standard-pack-release.js";
import type {
  StandardAssetCatalog,
  StandardAssetReleaseBinding,
  StandardAssetResolver,
} from "./standard-pack-release.js";

/** Machine-readable downstream restrictions attached to an accepted standard pack. */
export interface StandardAssetDownstreamConsumptionRules {
  readonly requiredBindingFields: readonly ["version", "catalogDigest", "sourceReceiptDigest"];
  readonly assetReferences: "semantic-keys-only";
  readonly materialization: "accepted-cartridge-selected-union-only";
  readonly canonicalRoot: "packages/advantage-play-kit/assets/standard";
  readonly privatePackTrees: "prohibited";
  readonly requiredCreditPlacement: "shared-credits-about-or-end-screen";
}

/** Root-orchestrator evidence proving that a standard-pack release is consumable. */
export interface StandardAssetAcceptanceEvidence {
  readonly assetCount: number;
  readonly browserQcRoute: "/qc";
  readonly compactViewport: "390x844";
  readonly wideViewport: "wide";
  readonly automatedGate: "pass";
  readonly browserQcGate: "pass";
}

/** Exact accepted standard-pack identity and the rules every downstream consumer must obey. */
export interface AcceptedStandardAssetRelease {
  readonly schemaVersion: 1;
  readonly status: "accepted";
  readonly version: string;
  readonly catalogDigest: string;
  readonly sourceReceiptDigest: string;
  readonly catalogArtifactSha256: string;
  readonly requiredCredit: typeof STANDARD_ASSET_REQUIRED_CREDIT;
  readonly acceptedAt: string;
  readonly acceptedBy: "root-orchestrator";
  readonly downstreamConsumptionRules: StandardAssetDownstreamConsumptionRules;
  readonly acceptanceEvidence: StandardAssetAcceptanceEvidence;
}

/** The only standard-pack release currently accepted for downstream APK work. */
export const ACCEPTED_STANDARD_ASSET_RELEASE = Object.freeze({
  schemaVersion: 1,
  status: "accepted",
  version: "2026.07.23",
  catalogDigest: "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
  sourceReceiptDigest: "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
  catalogArtifactSha256: "ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932",
  requiredCredit: STANDARD_ASSET_REQUIRED_CREDIT,
  acceptedAt: "2026-07-23T00:00:00Z",
  acceptedBy: "root-orchestrator",
  downstreamConsumptionRules: Object.freeze({
    requiredBindingFields: Object.freeze(["version", "catalogDigest", "sourceReceiptDigest"] as const),
    assetReferences: "semantic-keys-only",
    materialization: "accepted-cartridge-selected-union-only",
    canonicalRoot: "packages/advantage-play-kit/assets/standard",
    privatePackTrees: "prohibited",
    requiredCreditPlacement: "shared-credits-about-or-end-screen",
  }),
  acceptanceEvidence: Object.freeze({
    assetCount: 43_075,
    browserQcRoute: "/qc",
    compactViewport: "390x844",
    wideViewport: "wide",
    automatedGate: "pass",
    browserQcGate: "pass",
  }),
}) satisfies AcceptedStandardAssetRelease;

/** Accepted resolvers whose catalog and binding passed root-release verification. */
const acceptedStandardAssetResolvers = new WeakSet<object>();

async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto SHA-256 is required to validate the accepted standard asset catalog");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Creates a resolver only when the catalog and cartridge binding match the accepted release.
 * @param catalog The generated standard-pack catalog bundled by the consumer.
 * @param binding The exact release identity pinned by the cartridge.
 * @returns A semantic resolver after browser-safe payload verification succeeds.
 * @throws When the catalog or binding does not match the root-accepted release.
 */
export async function createAcceptedStandardAssetResolver(
  catalog: StandardAssetCatalog,
  binding: StandardAssetReleaseBinding,
): Promise<StandardAssetResolver> {
  const accepted = ACCEPTED_STANDARD_ASSET_RELEASE;
  if (
    catalog.schemaVersion !== accepted.schemaVersion
    || catalog.version !== accepted.version
    || catalog.digest !== accepted.catalogDigest
    || catalog.sourceReceiptDigest !== accepted.sourceReceiptDigest
    || catalog.requiredCredit !== accepted.requiredCredit
    || catalog.assets.length !== accepted.acceptanceEvidence.assetCount
  ) {
    throw new Error("Standard asset catalog is not the accepted release");
  }
  if (
    binding.version !== accepted.version
    || binding.catalogDigest !== accepted.catalogDigest
    || binding.sourceReceiptDigest !== accepted.sourceReceiptDigest
  ) {
    throw new Error("Standard asset binding does not pin the accepted release");
  }
  const payloadDigest = await sha256(serializeStandardAssetCatalogPayload(catalog));
  if (payloadDigest !== catalog.digest) {
    throw new Error("Standard asset catalog payload does not match its digest");
  }
  const resolver = createStandardAssetResolver(catalog, binding);
  acceptedStandardAssetResolvers.add(resolver);
  return resolver;
}

/**
 * Checks whether a resolver was created after accepted-release catalog verification.
 * @param candidate Resolver candidate supplied to an APK v2 provenance boundary.
 * @returns Whether the exact resolver instance is bound to the accepted standard-pack release.
 */
export function isAcceptedStandardAssetResolver(candidate: unknown): candidate is StandardAssetResolver {
  return typeof candidate === "object" && candidate !== null && acceptedStandardAssetResolvers.has(candidate);
}
