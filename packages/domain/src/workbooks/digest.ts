import { createHash } from "node:crypto";
import type { WorkbookSourceRecord } from "./contracts.js";

/**
 * Hash algorithm used for all workbook content digests.
 * A literal so the prefix and algorithm stay in lockstep.
 */
export const WORKBOOK_DIGEST_ALGORITHM = "sha256" as const;

/**
 * Compares two strings by comparing their code units directly.
 * @param a First string to compare.
 * @param b Second string to compare.
 * @returns -1 when a sorts before b, 1 when after, 0 when equal.
 */
function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
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
      .filter((key) => record[key] !== undefined)
      .sort(compareCodeUnits)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Serializes a value into canonical, key-ordered compact JSON so that records
 * with equivalent data digest identically regardless of key insertion order.
 * @param value JSON-compatible value to serialize.
 * @returns Deterministic compact JSON representation.
 */
export function canonicalizeWorkbookValue(value: unknown): string {
  return canonicalJson(value);
}

/**
 * Computes the canonical SHA-256 digest of a value, prefixed with the
 * algorithm name.
 * @param value JSON-compatible value to digest.
 * @returns Lowercase hexadecimal SHA-256 digest prefixed with "sha256:".
 */
export function computeWorkbookDigest(value: unknown): string {
  const hex = createHash(WORKBOOK_DIGEST_ALGORITHM)
    .update(canonicalizeWorkbookValue(value))
    .digest("hex");
  return `${WORKBOOK_DIGEST_ALGORITHM}:${hex}`;
}

/**
 * Computes the digest of a workbook source record's normalized content only.
 * @param record Workbook source record whose content requires digesting.
 * @returns SHA-256 digest of the record's content, prefixed with "sha256:".
 */
export function computeSourceRecordDigest(record: WorkbookSourceRecord): string {
  return computeWorkbookDigest(record.content);
}
