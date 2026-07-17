import { createHash } from "node:crypto";
import type { ArchitectureFinding } from "./contracts.js";
import { compareStableStrings } from "./stable-order.js";

/** Evidence fields that define one architecture finding identity. */
export type ArchitectureFindingIdentityInput = Pick<
  ArchitectureFinding,
  | "ruleId"
  | "domain"
  | "sourcePath"
  | "line"
  | "column"
  | "evidenceKind"
  | "resolvedTarget"
> &
  Partial<Pick<ArchitectureFinding, "resource">>;

/** Stable hashes attached to one validated architecture finding. */
export interface ArchitectureFindingIdentity {
  /** Policy-and-evidence identity that survives source moves. */
  semanticKey: string;
  /** Exact source-instance identity that changes when evidence moves. */
  instanceKey: string;
}

/**
 * Converts JSON-compatible data into key-sorted compact JSON.
 * @param value Value whose object keys require canonical ordering.
 * @returns Deterministic compact JSON representation.
 */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort(compareStableStrings)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Hashes a stable architecture identity using SHA-256.
 * @param value Canonical JSON-compatible identity value.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

/**
 * Creates the frozen semantic and source-instance hashes for one finding.
 * @param input Validated secret-safe architecture evidence fields.
 * @returns Stable SHA-256 semantic and instance identities.
 */
export function createFindingIdentity(
  input: ArchitectureFindingIdentityInput,
): ArchitectureFindingIdentity {
  const semanticKey = sha256({
    schemaVersion: 1,
    ruleId: input.ruleId,
    domain: input.domain,
    evidenceKind: input.evidenceKind,
    resource: input.resource ?? null,
    resolvedTarget: input.resolvedTarget,
  });
  return {
    semanticKey,
    instanceKey: sha256({
      semanticKey,
      sourcePath: input.sourcePath,
      line: input.line,
      column: input.column,
    }),
  };
}
