import { describe, expect, it } from "vitest";

import {
  capabilityCatalogSchema,
  capabilityCatalogEntrySchema,
  routeManifestSchema,
} from "../contracts/catalog.js";
import {
  INVALID_CAPABILITY_COMBINATIONS,
  invalidCombinationRuleSchema,
} from "../contracts/invalid-combinations.js";
import { capabilityRegistrySnapshotSchema } from "../contracts/registry.js";
import {
  routeBindingSchema,
  synchronousRouteBindingSchema,
  workerRouteBindingSchema,
} from "../contracts/route-bindings.js";

const entry = {
  id: "curriculum.lesson.get",
  kind: "query",
  summary: "Returns one lesson visible to the current school.",
  owner: {
    package: "@reading-advantage/backend",
    module: "curriculum",
  },
  auth: "user",
  risk: "ordinary",
  authorization: {
    mode: "policy",
    policyId: "curriculum.lesson.read",
  },
  tenancy: { mode: "school", resolverId: "auth.school" },
  transaction: { mode: "none" },
  errors: [
    {
      code: "LESSON_NOT_FOUND",
      safeMessage: "Lesson not found.",
      retryable: false,
      transport: { httpStatus: 404, jobOutcome: "terminal" },
    },
  ],
  audit: { mode: "none" },
  idempotency: { mode: "none" },
  observability: {
    operationName: "curriculum.lesson.get",
    timeoutMs: 2_000,
    cancellation: "supported",
    logLevel: "info",
  },
  inputSchemaFingerprint: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  outputSchemaFingerprint: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  bindings: ["next:http:GET:/api/lessons/:lessonId"],
  migration: "registered",
};

describe("catalog and route-binding contracts", () => {
  it("parses a deterministic handler-free capability catalog", () => {
    const parsed = capabilityCatalogSchema.parse({
      schemaVersion: 1,
      capabilities: [entry],
      legacyRoutes: [],
    });

    expect(capabilityCatalogEntrySchema.safeParse(entry).success).toBe(true);
    expect(
      capabilityCatalogEntrySchema.safeParse({
        ...entry,
        risk: "destructive",
      }).success,
    ).toBe(false);
    expect(parsed.capabilities[0]).not.toHaveProperty("handler");
    expect(parsed).not.toHaveProperty("generatedAt");
  });

  it("rejects duplicate or unsorted catalog IDs", () => {
    const duplicate = {
      schemaVersion: 1,
      capabilities: [entry, entry],
      legacyRoutes: [],
    };
    const unsorted = {
      schemaVersion: 1,
      capabilities: [
        { ...entry, id: "z.last" },
        { ...entry, id: "a.first" },
      ],
      legacyRoutes: [],
    };

    expect(capabilityCatalogSchema.safeParse(duplicate).success).toBe(false);
    expect(capabilityCatalogSchema.safeParse(unsorted).success).toBe(false);
  });

  it("defines a sorted, unique, handler-free registry snapshot", async () => {
    const { z } = await import("zod");
    const descriptor = {
      ...entry,
      input: z.strictObject({ lessonId: z.string() }),
      output: z.strictObject({ title: z.string() }),
    };
    const { inputSchemaFingerprint: _input, outputSchemaFingerprint: _output, bindings: _bindings, migration: _migration, ...descriptorMetadata } = descriptor;
    const snapshot = {
      entries: [
        {
          descriptor: descriptorMetadata,
          sourceModule: "packages/backend/src/modules/curriculum/get-lesson.ts",
        },
      ],
    };

    expect(capabilityRegistrySnapshotSchema.safeParse(snapshot).success).toBe(
      true,
    );
    expect(
      capabilityRegistrySnapshotSchema.safeParse({
        entries: [snapshot.entries[0], snapshot.entries[0]],
      }).success,
    ).toBe(false);
    expect(snapshot.entries[0]).not.toHaveProperty("handler");
  });

  it("models synchronous bindings separately from asynchronous worker bindings", () => {
    const requestBinding = {
      bindingId: "next:http:GET:/api/lessons/:lessonId",
      transport: "next-http",
      capabilityId: "curriculum.lesson.get",
      capabilityKind: "query",
      exposure: "authenticated",
      method: "GET",
      path: "/api/lessons/:lessonId",
    };
    const workerBinding = {
      bindingId: "worker:curriculum.lesson.index",
      transport: "worker",
      capabilityId: "curriculum.lesson.index",
      capabilityKind: "job",
      exposure: "internal",
      queue: "curriculum-index",
    };

    expect(synchronousRouteBindingSchema.safeParse(requestBinding).success).toBe(
      true,
    );
    expect(workerRouteBindingSchema.safeParse(workerBinding).success).toBe(true);
    expect(routeBindingSchema.safeParse(requestBinding).success).toBe(true);
    expect(routeBindingSchema.safeParse(workerBinding).success).toBe(true);
    expect(
      synchronousRouteBindingSchema.safeParse({
        ...requestBinding,
        capabilityKind: "job",
      }).success,
    ).toBe(false);
  });

  it("requires route manifests to be sorted and collision-free", () => {
    const first = {
      bindingId: "next:http:GET:/api/lessons/:lessonId",
      transport: "next-http",
      capabilityId: "curriculum.lesson.get",
      capabilityKind: "query",
      exposure: "authenticated",
      method: "GET",
      path: "/api/lessons/:lessonId",
    };

    expect(
      routeManifestSchema.safeParse({ schemaVersion: 1, bindings: [first] })
        .success,
    ).toBe(true);
    expect(
      routeManifestSchema.safeParse({
        schemaVersion: 1,
        bindings: [first, { ...first, bindingId: "duplicate-route" }],
      }).success,
    ).toBe(false);
  });

  it("exports a complete, stable, schema-valid invalid-combination matrix", () => {
    const ids = INVALID_CAPABILITY_COMBINATIONS.map((rule) => rule.id);

    expect(ids).toEqual([...ids].sort());
    expect(new Set(ids).size).toBe(ids.length);
    expect(INVALID_CAPABILITY_COMBINATIONS).toHaveLength(42);
    for (const rule of INVALID_CAPABILITY_COMBINATIONS) {
      expect(invalidCombinationRuleSchema.safeParse(rule).success).toBe(true);
    }
    expect(ids).toEqual(
      expect.arrayContaining([
        "binding.auth-exposure-mismatch",
        "binding.duplicate-method-path",
        "binding.job-synchronous",
        "classification.destructive-query-forbidden",
        "descriptor.handler-in-public-metadata",
        "descriptor.input-not-zod",
        "descriptor.output-not-zod",
        "errors.details-projection-required",
        "idempotency.query-forbidden",
        "idempotency.retryable-mutation-required",
        "observability.projection-mismatch",
        "registry.duplicate-capability-id",
        "tenancy.client-selected-tenant-forbidden",
        "transaction.query-must-be-none",
      ]),
    );
  });
});
