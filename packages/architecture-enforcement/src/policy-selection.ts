import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ownershipMapV1Data from "./config/ownership-map.v1.json";
import ownershipMapV2Data from "./config/ownership-map.v2.json";
import {
  architectureConfigSchema,
  type ArchitectureConfig,
} from "./contracts.js";
import { validateV1ArtifactFamilySync } from "./v1-validation.js";
import { validateAnalyzerReconciliationManifestV2Sync } from "./v2-manifest-validation.js";

/** Supported architecture policy versions. */
export type ArchitecturePolicyVersion = "v1" | "v2";

/** Lifecycle states exposed by the committed v2 candidate manifest. */
export type ArchitecturePolicyStatus = "candidate" | "accepted";

/** Validated policy selection with committed manifest metadata. */
export interface ArchitecturePolicySelection {
  /** Selected policy version. */
  policyVersion: ArchitecturePolicyVersion;
  /** Validated ownership map for the selected policy. */
  config: ArchitectureConfig;
  /** Candidate or accepted lifecycle state from the committed manifest. */
  status: ArchitecturePolicyStatus;
  /** Default policy recorded by the committed manifest. */
  defaultPolicy: ArchitecturePolicyVersion;
  /** Exact SHA-256 of the committed v2 manifest bytes. */
  manifestSha256: string;
}

/** Options controlling committed policy validation depth. */
export interface SelectArchitecturePolicyOptions {
  /** Whether current implementation and analyzer evidence must be checked. */
  validateCurrentState?: boolean;
}

const V1_MANIFEST_SHA256 =
  "4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0";

/** Hashes exact UTF-8 bytes with SHA-256. */
function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

const DEFAULT_REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const V2_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";

/** Validates the committed manifest metadata used by selection. */
function readCommittedManifestMetadata(
  repoRoot: string,
  options: SelectArchitecturePolicyOptions,
): {
  status: ArchitecturePolicyStatus;
  defaultPolicy: ArchitecturePolicyVersion;
  manifestSha256: string;
} {
  const v1Validation = validateV1ArtifactFamilySync({ repoRoot });
  if (!v1Validation.valid) {
    throw new Error(
      `Protected v1 artifacts do not match Gate 1: ${v1Validation.mismatches?.map((mismatch) => mismatch.path).join(", ")}`,
    );
  }
  const manifestSource = readFileSync(
    resolve(repoRoot, V2_MANIFEST_PATH),
    "utf8",
  );
  const manifest = JSON.parse(manifestSource) as {
    v1ManifestSha256?: unknown;
    acceptance?: {
      status?: unknown;
      defaultPolicy?: unknown;
    };
  };
  if (manifest.v1ManifestSha256 !== V1_MANIFEST_SHA256) {
    throw new Error("Committed v2 manifest does not protect the v1 manifest");
  }
  const validation = validateAnalyzerReconciliationManifestV2Sync({
    repoRoot,
    manifest,
    validateCurrentState: options.validateCurrentState ?? false,
  });
  if (!validation.valid) {
    throw new Error(
      `Committed v2 manifest is invalid: ${validation.errors?.join("; ")}`,
    );
  }
  const status = manifest.acceptance?.status;
  const defaultPolicy = manifest.acceptance?.defaultPolicy;
  if (status !== "candidate" && status !== "accepted") {
    throw new Error("Committed v2 manifest has an invalid lifecycle status");
  }
  if (defaultPolicy !== "v1" && defaultPolicy !== "v2") {
    throw new Error("Committed v2 manifest has an invalid default policy");
  }
  if (status === "candidate" && defaultPolicy !== "v1") {
    throw new Error("Candidate v2 manifests must retain v1 as the default");
  }
  if (status === "accepted" && defaultPolicy !== "v2") {
    throw new Error("Accepted v2 manifests must select v2 by default");
  }
  return {
    status,
    defaultPolicy,
    manifestSha256: sha256(manifestSource),
  };
}

/** Loads one policy artifact family without inferring policy from file presence. */
function loadOwnershipMapForPolicy(
  policyVersion: ArchitecturePolicyVersion,
): ArchitectureConfig {
  const data = policyVersion === "v1" ? ownershipMapV1Data : ownershipMapV2Data;
  return architectureConfigSchema.parse(data);
}

/** Selects v1, v2, or the committed default policy.
 * @param policyVersion Explicit policy version, or undefined for the committed default.
 * @param repoRoot Repository root containing committed policy artifacts.
 * @param options Validation depth for current implementation evidence.
 * @returns Validated policy selection and committed manifest metadata.
 * @throws When protected artifacts, manifest bytes, or policy contracts are invalid.
 */
export function selectArchitecturePolicy(
  policyVersion?: ArchitecturePolicyVersion,
  repoRoot = DEFAULT_REPOSITORY_ROOT,
  options: SelectArchitecturePolicyOptions = { validateCurrentState: false },
): ArchitecturePolicySelection {
  if (
    policyVersion !== undefined &&
    policyVersion !== "v1" &&
    policyVersion !== "v2"
  ) {
    throw new Error("Architecture policy must be v1 or v2");
  }
  const metadata = readCommittedManifestMetadata(repoRoot, options);
  const selectedPolicy = policyVersion ?? metadata.defaultPolicy;
  if (selectedPolicy !== "v1" && selectedPolicy !== "v2") {
    throw new Error("Architecture policy must be v1 or v2");
  }
  return {
    policyVersion: selectedPolicy,
    config: loadOwnershipMapForPolicy(selectedPolicy),
    ...metadata,
  };
}
