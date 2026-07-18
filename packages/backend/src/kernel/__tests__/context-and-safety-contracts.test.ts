import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import {
  auditEventSchema,
  auditMetadataEnvelopeSchema,
  type AuditEvent,
  type AuditMetadataProjectorRegistryReadHandle,
  type ImmutableAuditPort,
} from "../contracts/audit.js";
import {
  adapterTokenSchema,
  authenticatedPrincipalSchema,
  authenticationEvidenceSchema,
  authorizationDecisionSchema,
  globalTenantResolutionRequestSchema,
  referentialTenantResolutionRequestSchema,
  tenantLookupReferenceSchema,
  tenantResolutionRequestSchema,
  trustedTenantSchema,
  type AdapterEffect,
  type AdapterToken,
  type AuthenticationPort,
  type AuthorizationPort,
  type CapabilityExecutionContext,
  type ResourceReferenceProjectorRegistryReadHandle,
  type ScopedAdapterAccess,
  type TenantResolutionPort,
  type TransactionPort,
} from "../contracts/context.js";
import {
  errorDetailsEnvelopeSchema,
  platformErrorSchema,
  type PlatformErrorData,
} from "../contracts/errors.js";
import {
  idempotencyAcquireRequestSchema,
  idempotencyAcquireResultSchema,
  idempotencyFailureSettlementSchema,
  idempotencyNamespaceSchema,
  type DurableIdempotencyPort,
} from "../contracts/idempotency.js";
import {
  createAllowedProjectionContract,
  projectedDataEnvelopeSchema,
  type StructuredDataProjectorRegistryReadHandle,
  type ValidatedProjectedData,
} from "../contracts/projections.js";
import { RESOURCE_REFERENCE_SCHEMA_IDENTITY } from "../contracts/policies.js";

const auditProjection = createAllowedProjectionContract({
  projectorId: "curriculum.lesson.audit",
  shape: {
    changes: z.strictObject({ state: z.string() }),
    resourceId: z.string(),
  },
});

describe("executor boundary contracts", () => {
  it("exports provider-neutral execution and reviewed projector ports", () => {
    expectTypeOf<AuthenticationPort>().toBeObject();
    expectTypeOf<TenantResolutionPort>().toBeObject();
    expectTypeOf<AuthorizationPort>().toBeObject();
    expectTypeOf<TransactionPort>().toBeObject();
    expectTypeOf<ScopedAdapterAccess>().toBeObject();
    expectTypeOf<AdapterToken<unknown>>().toBeObject();
    expectTypeOf<CapabilityExecutionContext>().toBeObject();
    expectTypeOf<StructuredDataProjectorRegistryReadHandle>().toBeObject();
    expectTypeOf<AuditMetadataProjectorRegistryReadHandle>().toBeObject();
    expectTypeOf<ResourceReferenceProjectorRegistryReadHandle>().toBeObject();
  });

  it("validates transport-neutral identity, tenant, authorization, and adapter boundaries", () => {
    expect(authenticationEvidenceSchema.parse({ kind: "anonymous" })).toEqual({
      kind: "anonymous",
    });
    expect(
      authenticatedPrincipalSchema.safeParse({
        userId: "user-1",
        roles: ["STUDENT"],
        schoolId: "school-1",
      }).success,
    ).toBe(true);
    expect(trustedTenantSchema.safeParse({ mode: "global" }).success).toBe(true);
    expect(
      trustedTenantSchema.safeParse({
        mode: "referential",
        schoolId: "school-1",
        referenceId: "classroom-1",
        ownerScopeReason: "classroom owner verified through school membership",
      }).success,
    ).toBe(true);
    expect(authorizationDecisionSchema.parse({ allowed: true })).toEqual({
      allowed: true,
    });
    expect(
      tenantLookupReferenceSchema.safeParse({
        resourceType: "curriculum.lesson",
        resourceId: "lesson-1",
        schoolId: "forged-school",
      }).success,
    ).toBe(false);
    expect(
      adapterTokenSchema.parse({ id: "storage.files", effect: "network" }),
    ).toEqual({ id: "storage.files", effect: "network" });
    expectTypeOf<AdapterEffect>().toEqualTypeOf<
      "local" | "database" | "network"
    >();
  });

  it("couples tenant request policy, reference presence, and result mode", () => {
    const referentialPolicy = {
      mode: "referential",
      resolverId: "classroom.student.tenant",
      resourceReferenceProjectorId: "classroom.student.reference",
      resourceReferenceSchemaIdentity: RESOURCE_REFERENCE_SCHEMA_IDENTITY,
      ownerScopePolicyId: "classroom.student.owner",
    };

    expect(
      referentialTenantResolutionRequestSchema.safeParse({
        mode: "referential",
        policy: referentialPolicy,
        principal: null,
        correlationId: "correlation-1",
      }).success,
    ).toBe(false);
    expect(
      tenantResolutionRequestSchema.safeParse({
        mode: "referential",
        policy: referentialPolicy,
        principal: null,
        correlationId: "correlation-1",
        resourceReference: {
          resourceType: "classroom.student",
          resourceId: "student-1",
        },
      }).success,
    ).toBe(true);
    expect(
      globalTenantResolutionRequestSchema.safeParse({
        mode: "global",
        policy: {
          mode: "global",
          globalPolicyId: "platform.status.public",
        },
        principal: null,
        correlationId: "correlation-1",
        resourceReference: {
          resourceType: "classroom.student",
          resourceId: "student-1",
        },
      }).success,
    ).toBe(false);
    expect(
      tenantResolutionRequestSchema.safeParse({
        mode: "school",
        policy: { mode: "school", resolverId: "auth.school" },
        principal: null,
        correlationId: "correlation-1",
        resourceReference: {
          resourceType: "classroom.student",
          resourceId: "student-1",
        },
      }).success,
    ).toBe(false);
    expect(
      tenantResolutionRequestSchema.safeParse({
        mode: "school",
        policy: referentialPolicy,
        principal: null,
        correlationId: "correlation-1",
      }).success,
    ).toBe(false);
  });

  it("validates exact reviewed projection keys and rejects open payloads", () => {
    const metadata = auditProjection.validate({
      resourceId: "lesson-1",
      changes: { state: "published" },
    });

    expect(auditMetadataEnvelopeSchema.safeParse(metadata).success).toBe(true);
    for (const key of ["message", "value", "data"] as const) {
      expect(() =>
        auditProjection.validate({
          resourceId: "lesson-1",
          changes: { state: "published" },
          [key]: { accessToken: "provider-credential" },
        }),
      ).toThrow();
    }

    const reviewedMessage = createAllowedProjectionContract({
      projectorId: "errors.lesson.message",
      shape: { message: z.string().max(100) },
    });
    expect(reviewedMessage.validate({ message: "Reviewed summary" }).values)
      .toEqual({ message: "Reviewed summary" });
    expect(() =>
      reviewedMessage.validate({ message: { value: "provider payload" } }),
    ).toThrow();

    for (const key of [
      "accessToken",
      "apiKey",
      "privateKey",
      "sessionCookie",
    ] as const) {
      expect(() =>
        createAllowedProjectionContract({
          projectorId: "audit.forbidden.key",
          shape: { [key]: z.string() },
        }),
      ).toThrow();
    }
    expect(() =>
      createAllowedProjectionContract({
        projectorId: "audit.forbidden.nested",
        shape: { data: z.strictObject({ token: z.string() }) },
      }),
    ).toThrow();
    expect(() =>
      createAllowedProjectionContract({
        projectorId: "audit.forbidden.open",
        shape: { data: z.unknown() },
      }),
    ).toThrow();
    for (const schema of [
      z.date(),
      z.bigint(),
      z.function(),
      z.promise(z.string()),
      z.string().transform((value) => ({ value })),
      z.preprocess((value) => value, z.string()),
      z.string().catch("fallback"),
      z.string().default("fallback"),
      z.string().refine((value) => value.length < 100),
    ]) {
      expect(() =>
        createAllowedProjectionContract({
          projectorId: "audit.forbidden.schema",
          shape: { data: schema },
        }),
      ).toThrow();
    }
    expectTypeOf(metadata).toMatchTypeOf<ValidatedProjectedData>();
    expectTypeOf<z.infer<typeof projectedDataEnvelopeSchema>>()
      .not.toMatchTypeOf<ValidatedProjectedData>();
  });

  it("derives stable identities from exact nested projection semantics", () => {
    const first = createAllowedProjectionContract({
      projectorId: "audit.identity.first",
      shape: {
        label: z.string().min(2).max(100),
        nested: z.strictObject({ count: z.number().int().min(0) }),
      },
    });
    const reordered = createAllowedProjectionContract({
      projectorId: "audit.identity.reordered",
      shape: {
        nested: z.strictObject({ count: z.number().int().min(0) }),
        label: z.string().min(2).max(100),
      },
    });
    const nestedChanged = createAllowedProjectionContract({
      projectorId: "audit.identity.nested-changed",
      shape: {
        label: z.string().min(2).max(100),
        nested: z.strictObject({ count: z.number().int().min(1) }),
      },
    });
    const constraintChanged = createAllowedProjectionContract({
      projectorId: "audit.identity.constraint-changed",
      shape: {
        label: z.string().min(3).max(100),
        nested: z.strictObject({ count: z.number().int().min(0) }),
      },
    });

    expect(first.reference.schemaIdentity).toBe(
      reordered.reference.schemaIdentity,
    );
    expect(first.reference.schemaIdentity).not.toBe(
      nestedChanged.reference.schemaIdentity,
    );
    expect(first.reference.schemaIdentity).not.toBe(
      constraintChanged.reference.schemaIdentity,
    );
  });

  it("rejects non-finite literals and constraints before JSON hashing", () => {
    const nullLiteral = createAllowedProjectionContract({
      projectorId: "audit.identity.null-literal",
      shape: { value: z.literal(null) },
    });

    expect(nullLiteral.reference.schemaIdentity).toMatch(/^sha256:[a-f0-9]{64}$/u);
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() =>
        createAllowedProjectionContract({
          projectorId: "audit.identity.nonfinite-literal",
          shape: { value: z.literal(value) },
        }),
      ).toThrow(/Non-finite|Unsupported/u);
    }
    for (const schema of [
      z.number().min(Number.POSITIVE_INFINITY),
      z.number().max(Number.NEGATIVE_INFINITY),
    ]) {
      expect(() =>
        createAllowedProjectionContract({
          projectorId: "audit.identity.nonfinite-constraint",
          shape: { value: schema },
        }),
      ).toThrow(/Non-finite/u);
    }
  });

  it("defines immutable audit event and append-only audit port contracts", () => {
    const metadata = auditProjection.validate({
      resourceId: "lesson-1",
      changes: { state: "published" },
    });
    const parsedEvent = auditEventSchema.parse({
      eventId: "evt-1",
      eventType: "curriculum.lesson.published",
      occurredAt: "2026-07-18T00:00:00.000Z",
      capabilityId: "curriculum.lesson.publish",
      correlationId: "correlation-1",
      actor: { type: "user", id: "user-1" },
      tenant: { mode: "school", schoolId: "school-1" },
      outcome: "success",
      metadata,
    });
    const event: AuditEvent = { ...parsedEvent, metadata };

    expect(event.outcome).toBe("success");
    expectTypeOf<ImmutableAuditPort>().toBeObject();
  });

  it("accepts projected platform-error details and rejects unvalidated records", () => {
    const details = auditProjection.validate({
      resourceId: "lesson-1",
      changes: { state: "missing" },
    });
    const error: PlatformErrorData = {
      code: "LESSON_NOT_FOUND",
      message: "Lesson not found.",
      retryable: false,
      details,
    };
    expect(platformErrorSchema.safeParse(error).success).toBe(true);
    expect(
      errorDetailsEnvelopeSchema.safeParse({ values: { message: "provider" } })
        .success,
    ).toBe(false);
    expect(
      platformErrorSchema.safeParse({
        code: "INTERNAL",
        message: "Internal error.",
        retryable: false,
        stack: "provider trace",
      }).success,
    ).toBe(false);
  });

  it("models durable idempotency owner, replay, conflict, and settlement", () => {
    const namespace = idempotencyNamespaceSchema.parse({
      capabilityId: "curriculum.lesson.publish",
      scope: "tenant-capability",
      tenantId: "school-1",
    });
    const fingerprint = `sha256:${"a".repeat(64)}`;

    expect(
      idempotencyAcquireRequestSchema.safeParse({
        namespace,
        keyFingerprint: fingerprint,
        inputFingerprint: fingerprint,
        retentionSeconds: 86_400,
      }).success,
    ).toBe(true);
    expect(
      idempotencyAcquireRequestSchema.safeParse({
        namespace,
        key: "raw-caller-key",
        inputFingerprint: fingerprint,
        retentionSeconds: 86_400,
      }).success,
    ).toBe(false);
    expect(
      idempotencyAcquireResultSchema.parse({
        status: "owner",
        ownershipToken: "opaque-owner-token",
      }).status,
    ).toBe("owner");
    expect(
      idempotencyAcquireResultSchema.parse({
        status: "replay",
        output: { title: "Lesson" },
      }).status,
    ).toBe("replay");
    expect(
      idempotencyAcquireResultSchema.parse({
        status: "conflict",
        code: "IDEMPOTENCY_IN_PROGRESS",
        retryable: true,
      }).status,
    ).toBe("conflict");
    expect(
      idempotencyFailureSettlementSchema.parse({
        ownershipToken: "opaque-owner-token",
        error: {
          code: "INTERNAL",
          message: "Internal error.",
          retryable: true,
        },
        disposition: "store-retryable",
      }).disposition,
    ).toBe("store-retryable");
    expectTypeOf<DurableIdempotencyPort>().toBeObject();
  });
});
