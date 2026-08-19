import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** One protected v1 artifact and its accepted byte hash. */
export interface V1ArtifactBinding {
  /** Exact repository-relative artifact path. */
  path: string;
  /** Accepted lowercase SHA-256 of the artifact bytes. */
  acceptedSha256: string;
}

/** Result of validating all protected v1 artifacts. */
export interface V1ArtifactValidationResult {
  /** True when every protected artifact has its accepted bytes. */
  valid: boolean;
  /** Every artifact whose current bytes differ from its accepted bytes. */
  mismatches?: readonly {
    path: string;
    expectedSha256: string;
    actualSha256: string;
  }[];
}

/** Input accepted by synchronous protected-artifact validation. */
export interface ValidateV1ArtifactFamilyInput {
  /** Repository root containing the protected artifact family. */
  repoRoot: string;
}

/** Immutable v1 artifact bindings accepted by Gate 1. */
export const V1_ARTIFACT_BINDINGS: readonly V1ArtifactBinding[] = [
  {
    path: "packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json",
    acceptedSha256:
      "4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0",
  },
  {
    path: "packages/architecture-enforcement/src/config/ownership-map.v1.json",
    acceptedSha256:
      "f6d7b64d8d0091ef9d696d3bf0677f3b995ee78f41011ed56eea50399949f1e8",
  },
  {
    path: "packages/architecture-enforcement/src/config/baselines/database.v1.json",
    acceptedSha256:
      "8de5a20f36bd81fc492cd4e99676a439d4e2545dea927ed8389f186d08f4fe73",
  },
  {
    path: "packages/architecture-enforcement/src/config/baselines/provider.v1.json",
    acceptedSha256:
      "7137e81c662f25073e233144a585178fdd19ec324630f58cc5a807de42b4ace5",
  },
];

/** Hashes exact bytes with SHA-256. */
function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Validates the protected Gate 1 v1 artifact family. */
export async function validateV1ArtifactFamily(input: {
  repoRoot: string;
}): Promise<V1ArtifactValidationResult> {
  const mismatches: Array<{
    path: string;
    expectedSha256: string;
    actualSha256: string;
  }> = [];
  for (const artifact of V1_ARTIFACT_BINDINGS) {
    try {
      const actualSha256 = sha256(
        await readFile(resolve(input.repoRoot, artifact.path)),
      );
      if (actualSha256 !== artifact.acceptedSha256) {
        mismatches.push({
          path: artifact.path,
          expectedSha256: artifact.acceptedSha256,
          actualSha256,
        });
      }
    } catch {
      mismatches.push({
        path: artifact.path,
        expectedSha256: artifact.acceptedSha256,
        actualSha256: "0".repeat(64),
      });
    }
  }
  return mismatches.length === 0
    ? { valid: true }
    : { valid: false, mismatches };
}

/** Validates every protected Gate 1 v1 artifact without changing its bytes. */
export function validateV1ArtifactFamilySync(
  input: ValidateV1ArtifactFamilyInput,
): V1ArtifactValidationResult {
  const mismatches: Array<{
    path: string;
    expectedSha256: string;
    actualSha256: string;
  }> = [];
  for (const artifact of V1_ARTIFACT_BINDINGS) {
    try {
      const actualSha256 = sha256(
        readFileSync(resolve(input.repoRoot, artifact.path)),
      );
      if (actualSha256 !== artifact.acceptedSha256) {
        mismatches.push({
          path: artifact.path,
          expectedSha256: artifact.acceptedSha256,
          actualSha256,
        });
      }
    } catch {
      mismatches.push({
        path: artifact.path,
        expectedSha256: artifact.acceptedSha256,
        actualSha256: "0".repeat(64),
      });
    }
  }
  return mismatches.length === 0
    ? { valid: true }
    : { valid: false, mismatches };
}
