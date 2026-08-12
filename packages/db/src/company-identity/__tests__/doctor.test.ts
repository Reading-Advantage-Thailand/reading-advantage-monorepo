import { describe, expect, it } from "vitest";

import {
  isExactCompanyIdentityFinanceMetadataConstraintDefinition,
} from "../doctor.js";

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
  "actorKind",
  "actorSubjectId",
  "objectId",
    "requestId",
    "eventId",
    "occurredAt",
    "schoolId",
    "claimsVersion",
  "policyVersion",
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

const PG16_DEFINITION =
  "CHECK (jsonb_typeof(metadata) = 'object'::text AND (metadata - ARRAY['source'::text, 'previousStatus'::text, 'newStatus'::text, 'roleKey'::text, 'clientId'::text, 'requestedClientId'::text, 'registeredClientId'::text, 'applicationKey'::text, 'resourceType'::text, 'actorKind'::text, 'actorSubjectId'::text, 'objectId'::text, 'requestId'::text, 'eventId'::text, 'occurredAt'::text, 'schoolId'::text, 'claimsVersion'::text, 'policyVersion'::text, 'routeBindingId'::text, 'routeMethod'::text, 'routePath'::text, 'routeTransport'::text, 'credentialAlgorithm'::text, 'sessionCount'::text, 'normalizationVersion'::text, 'migrationRunId'::text, 'sourcePrincipalId'::text, 'sourceFingerprint'::text, 'idempotencyReplay'::text, 'expiresAt'::text, 'reasonCategory'::text]) = '{}'::jsonb)";

describe("company identity doctor Finance metadata sentinel", () => {
  it("accepts the exact PostgreSQL 16 pg_get_constraintdef output", () => {
    expect(
      isExactCompanyIdentityFinanceMetadataConstraintDefinition(
        PG16_DEFINITION,
        EXPECTED_KEYS,
      ),
    ).toBe(true);
  });

  it("accepts supported PostgreSQL keyword and cast formatting", () => {
    const formatted = PG16_DEFINITION
      .replace("CHECK", "check")
      .replace("jsonb_typeof", "JSONB_TYPEOF")
      .replace(" AND ", " and ")
      .replace("'object'::text", "'object'::TEXT")
      .replace("'{}'::jsonb", "'{}'::JSONB");
    expect(
      isExactCompanyIdentityFinanceMetadataConstraintDefinition(
        formatted,
        EXPECTED_KEYS,
      ),
    ).toBe(true);
  });

  it.each([
    [
      "tautology",
      PG16_DEFINITION.replace(
        "jsonb_typeof(metadata) = 'object'::text AND",
        "true OR jsonb_typeof(metadata) = 'object'::text AND",
      ),
    ],
    [
      "superset",
      PG16_DEFINITION.replace(
        "'reasonCategory'::text])",
        "'reasonCategory'::text, 'unreviewedSecret'::text])",
      ),
    ],
    [
      "reordered keys",
      PG16_DEFINITION.replace(
        "'source'::text, 'previousStatus'::text",
        "'previousStatus'::text, 'source'::text",
      ),
    ],
    [
      "duplicate key",
      PG16_DEFINITION.replace(
        "'source'::text, 'previousStatus'::text",
        "'source'::text, 'source'::text, 'previousStatus'::text",
      ),
    ],
    [
      "omitted key",
      PG16_DEFINITION.replace("'policyVersion'::text, ", ""),
    ],
    [
      "changed operator",
      PG16_DEFINITION.replace("metadata - ARRAY", "metadata + ARRAY"),
    ],
    [
      "changed element cast",
      PG16_DEFINITION.replace("'source'::text", "'source'::varchar"),
    ],
    [
      "changed final cast",
      PG16_DEFINITION.replace("'{}'::jsonb", "'{}'::text"),
    ],
    [
      "changed object literal case",
      PG16_DEFINITION.replace("'object'::text", "'OBJECT'::text"),
    ],
    [
      "changed object literal contents",
      PG16_DEFINITION.replace("'object'::text", "'ob ject'::text"),
    ],
    [
      "changed metadata key literal case",
      PG16_DEFINITION.replace(
        "'previousStatus'::text",
        "'previousstatus'::text",
      ),
    ],
    [
      "changed metadata key literal contents",
      PG16_DEFINITION.replace(
        "'previousStatus'::text",
        "'previous Status'::text",
      ),
    ],
    [
      "changed metadata key spelling case",
      PG16_DEFINITION.replace("'actorKind'::text", "'actorkind'::text"),
    ],
    [
      "changed metadata key by adding a double quote",
      PG16_DEFINITION.replace(
        "'previousStatus'::text",
        "'previ\"ousStatus'::text",
      ),
    ],
    [
      "changed object literal by adding a double quote",
      PG16_DEFINITION.replace("'object'::text", "'ob\"ject'::text"),
    ],
    [
      "added array cast",
      PG16_DEFINITION.replace(
        "]) = '{}'::jsonb",
        "]::text[]) = '{}'::jsonb",
      ),
    ],
  ] as const)("rejects $0", (_name, definition) => {
    expect(
      isExactCompanyIdentityFinanceMetadataConstraintDefinition(
        definition,
        EXPECTED_KEYS,
      ),
    ).toBe(false);
  });
});
