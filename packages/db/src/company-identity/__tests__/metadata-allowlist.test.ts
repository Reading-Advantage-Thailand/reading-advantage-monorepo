import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { auditMetadataSchema } from "../contracts/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DB_ROOT = resolve(HERE, "../../..");
const EXPECTED_KEYS = [
  "source",
  "previousStatus",
  "newStatus",
  "roleKey",
  "clientId",
  "requestedClientId",
  "registeredClientId",
  "applicationKey",
  "resourceType",
  "routeBindingId",
  "routeMethod",
  "routePath",
  "routeTransport",
  "credentialAlgorithm",
  "sessionCount",
  "normalizationVersion",
  "migrationRunId",
  "sourcePrincipalId",
  "sourceFingerprint",
  "idempotencyReplay",
  "expiresAt",
  "reasonCategory",
] as const;

/** Extracts the reviewed SQL array from a schema, migration, or snapshot source. */
function extractSqlAllowlist(source: string): string[] {
  const match = source.match(
    /metadata_allowed_keys_check[\s\S]*?ARRAY\[([^\]]+)\]::text\[\]/,
  );
  expect(match).not.toBeNull();
  return [...match![1]!.matchAll(/'([^']+)'/g)].map((entry) => entry[1]!);
}

describe("company-identity audit metadata allowlist", () => {
  it("accepts every key persisted by the reviewed protocol and adapters", () => {
    const candidate = Object.fromEntries(
      EXPECTED_KEYS.map((key) => [
        key,
        key === "roleKey"
          ? "EMPLOYEE"
          : key === "credentialAlgorithm"
            ? "ARGON2ID"
            : key === "migrationRunId"
              ? "80000000-0000-4000-8000-000000000001"
              : key === "sessionCount" || key === "normalizationVersion"
                ? 1
                : key === "idempotencyReplay"
                  ? false
                  : key === "routeMethod"
                    ? "HEAD"
                    : key === "routeTransport"
                      ? "next-http"
                      : key === "expiresAt"
                        ? "2026-07-15T12:05:00.000Z"
                        : key === "sourceFingerprint"
                          ? "a".repeat(64)
                          : "safe-value",
      ]),
    );

    for (const routeMethod of ["HEAD", "OPTIONS"] as const) {
      expect(
        Object.keys(
          auditMetadataSchema.parse({ ...candidate, routeMethod }),
        ).sort(),
      ).toEqual([...EXPECTED_KEYS].sort());
    }
    expect(Object.keys(auditMetadataSchema.shape).sort()).toEqual(
      [...EXPECTED_KEYS].sort(),
    );
  });

  it("keeps the Drizzle schema, migration, and snapshot on the same key set", () => {
    const schemaSource = readFileSync(
      join(DB_ROOT, "src/company-identity/schema/index.ts"),
      "utf8",
    );
    const migration = readFileSync(
      join(
        DB_ROOT,
        "company-identity/drizzle/0002_identity_audit_metadata_allowlist.sql",
      ),
      "utf8",
    );
    const snapshot = readFileSync(
      join(DB_ROOT, "company-identity/drizzle/meta/0002_snapshot.json"),
      "utf8",
    );

    expect(extractSqlAllowlist(schemaSource)).toEqual([...EXPECTED_KEYS]);
    expect(extractSqlAllowlist(migration)).toEqual([...EXPECTED_KEYS]);
    expect(extractSqlAllowlist(snapshot)).toEqual([...EXPECTED_KEYS]);
    expect(schemaSource).not.toContain("targetAccountId'");
    expect(migration).not.toContain("targetAccountId'");
  });
});
