import { describe, expect, it } from "vitest";
import { z } from "zod";

import type {
  AuditMetadataProjectorDefinition,
} from "../contracts/audit.js";
import type {
  ResourceReferenceProjectorDefinition,
} from "../contracts/context.js";
import type {
  CapabilityDescriptor,
  CapabilityHandler,
} from "../contracts/descriptors.js";
import {
  RESOURCE_REFERENCE_SCHEMA_IDENTITY,
} from "../contracts/policies.js";
import {
  createAllowedProjectionContract,
  type ProjectionReference,
  type StructuredDataProjectorDefinition,
} from "../contracts/projections.js";
import {
  createCapabilityRegistry,
  type CapabilityRegistration,
  type CapabilityRegistrationReferences,
  type CapabilityRegistryDependencies,
} from "../runtime.js";

const SHA_A = `sha256:${"a".repeat(64)}`;
const input = z.strictObject({ lessonId: z.string().min(1) });
const output = z.strictObject({ title: z.string().min(1) });
const auditProjection = createAllowedProjectionContract({
  projectorId: "curriculum.lesson.audit",
  shape: { resourceId: z.string().min(1) },
});
const structuredProjection = createAllowedProjectionContract({
  projectorId: "curriculum.lesson.attributes",
  shape: { resourceId: z.string().min(1) },
});

const auditProjector = {
  contract: auditProjection,
  project: async () => ({ resourceId: "lesson-1" }),
} satisfies AuditMetadataProjectorDefinition<unknown>;
const structuredProjector = {
  contract: structuredProjection,
  project: async () => ({ resourceId: "lesson-1" }),
} satisfies StructuredDataProjectorDefinition<unknown, { resourceId: z.ZodString }>;
const resourceProjector = {
  projectorId: "curriculum.lesson.reference",
  schemaIdentity: RESOURCE_REFERENCE_SCHEMA_IDENTITY,
  project: async () => ({
    resourceType: "curriculum.lesson",
    resourceId: "lesson-1",
  }),
} satisfies ResourceReferenceProjectorDefinition<unknown>;

function referencesMatch(
  left: Readonly<ProjectionReference>,
  right: Readonly<ProjectionReference>,
): boolean {
  return left.projectorId === right.projectorId &&
    left.schemaIdentity === right.schemaIdentity &&
    left.allowedKeys.length === right.allowedKeys.length &&
    left.allowedKeys.every((key, index) => key === right.allowedKeys[index]);
}

const references = {
  authorizationPolicies: {
    getAuthorizationPolicy: (policyId: string) =>
      policyId === "curriculum.lesson.read" ||
      policyId === "curriculum.lesson.publish"
        ? {
            policyId,
            authentication: "user" as const,
            parameterProjection: structuredProjection.reference,
          }
        : undefined,
  },
  globalTenancyPolicies: {
    getGlobalTenancyPolicy: (policyId: string) =>
      policyId === "curriculum.lesson.global"
        ? {
            policyId,
            ownerPackage: "@reading-advantage/backend",
          }
        : undefined,
  },
  tenantResolvers: {
    getTenantResolver: (resolverId: string) => {
      if (resolverId === "auth.school") {
        return { resolverId, modes: ["school"] as const };
      }
      if (resolverId === "curriculum.lesson.owner") {
        return { resolverId, modes: ["referential"] as const };
      }
      return undefined;
    },
  },
  structuredProjectors: {
    getProjector: (reference: Readonly<ProjectionReference>) =>
      referencesMatch(reference, structuredProjection.reference)
        ? structuredProjector
        : undefined,
  },
  auditProjectors: {
    getAuditProjector: (reference: Readonly<ProjectionReference>) =>
      referencesMatch(reference, auditProjection.reference)
        ? auditProjector
        : undefined,
  },
  resourceReferenceProjectors: {
    getResourceReferenceProjector: (projectorId: string) =>
      projectorId === resourceProjector.projectorId
        ? resourceProjector
        : undefined,
  },
  externalCallProtocols: {
    hasExternalCallProtocol: (protocolRef: string) =>
      protocolRef === "curriculum.lesson.outbox",
  },
} satisfies CapabilityRegistrationReferences;

const dependencies = {
  ownership: {
    allows: (_descriptor, sourceModule) =>
      sourceModule.startsWith("packages/backend/src/modules/curriculum/"),
  },
  references,
} satisfies CapabilityRegistryDependencies;

const publicQuery = {
  id: "curriculum.lesson.get",
  summary: "Returns one public lesson.",
  owner: {
    package: "@reading-advantage/backend",
    module: "curriculum",
  },
  input,
  output,
  auth: "public",
  risk: "ordinary",
  authorization: { mode: "none" },
  tenancy: {
    mode: "global",
    globalPolicyId: "curriculum.lesson.global",
  },
  errors: [],
  audit: { mode: "none" },
  observability: {
    operationName: "curriculum.lesson.get",
    timeoutMs: 2_000,
    cancellation: "supported",
    logLevel: "info",
  },
  kind: "query",
  transaction: { mode: "none" },
  idempotency: { mode: "none" },
} satisfies CapabilityDescriptor;

const protectedQuery = {
  ...publicQuery,
  id: "curriculum.lesson.read",
  auth: "user",
  authorization: {
    mode: "policy",
    policyId: "curriculum.lesson.read",
    parameterProjection: structuredProjection.reference,
  },
  tenancy: { mode: "school", resolverId: "auth.school" },
} satisfies CapabilityDescriptor;

const command = {
  ...protectedQuery,
  id: "curriculum.lesson.publish",
  summary: "Publishes one lesson.",
  risk: "security-sensitive",
  authorization: {
    mode: "policy",
    policyId: "curriculum.lesson.publish",
    parameterProjection: structuredProjection.reference,
  },
  audit: {
    mode: "required",
    eventType: "curriculum.lesson.published",
    metadataProjection: auditProjection.reference,
    immutable: true,
  },
  kind: "command",
  transaction: { mode: "required" },
  idempotency: {
    mode: "required",
    keySchema: z.string().min(16).max(200),
    scope: "tenant-capability",
    retentionSeconds: 3_600,
    conflict: "replay",
  },
} satisfies CapabilityDescriptor;

const job = {
  ...command,
  id: "curriculum.lesson.reindex",
  summary: "Reindexes one lesson asynchronously.",
  kind: "job",
} satisfies CapabilityDescriptor;

const nestedMetadataCommand = {
  ...command,
  errors: [{
    code: "LESSON_BUSY",
    safeMessage: "Lesson is busy.",
    retryable: true,
    transport: {
      httpStatus: 409,
      trpcCode: "CONFLICT",
      jobOutcome: "retry",
    },
    detailsProjection: structuredProjection.reference,
  }],
  observability: {
    ...command.observability,
    attributeProjection: structuredProjection.reference,
  },
} satisfies CapabilityDescriptor;

const handler: CapabilityHandler<unknown, unknown> = async (_context, value) =>
  value;

function registration(
  descriptor: CapabilityDescriptor = publicQuery,
  sourceModule = "packages/backend/src/modules/curriculum/get-lesson.ts",
): CapabilityRegistration {
  return { descriptor, handler, sourceModule };
}

function malformed(value: unknown): CapabilityDescriptor {
  return value as CapabilityDescriptor;
}

function changedReference(
  changes: Partial<ProjectionReference>,
): ProjectionReference {
  return { ...auditProjection.reference, ...changes };
}

describe("runtime capability registration Red matrix", () => {
  it("stores a valid descriptor while keeping its handler private", () => {
    const registry = createCapabilityRegistry(dependencies);

    registry.register(registration());

    expect(registry.listDescriptors()).toEqual([publicQuery]);
    expect(registry.snapshot().entries).toEqual([
      {
        descriptor: publicQuery,
        sourceModule: "packages/backend/src/modules/curriculum/get-lesson.ts",
      },
    ]);
    expect(registry).not.toHaveProperty("getHandler");
    expect(registry).not.toHaveProperty("invoke");
  });

  it("registers a durable job while keeping its handler private", () => {
    const registry = createCapabilityRegistry(dependencies);

    registry.register(registration(job));

    expect(registry.getDescriptor(job.id)).toEqual(job);
    expect(registry.snapshot().entries).toEqual([
      {
        descriptor: job,
        sourceModule: "packages/backend/src/modules/curriculum/get-lesson.ts",
      },
    ]);
    expect(registry).not.toHaveProperty("getHandler");
    expect(registry).not.toHaveProperty("invoke");
  });

  it("rejects a duplicate capability ID", () => {
    const registry = createCapabilityRegistry(dependencies);
    registry.register(registration());

    expect(() => registry.register(registration())).toThrow(
      /registry\.duplicate-capability-id/u,
    );
  });

  it.each([
    ["non-Zod input", "descriptor.input-not-zod", { ...publicQuery, input: {} }],
    ["non-Zod output", "descriptor.output-not-zod", { ...publicQuery, output: {} }],
    ["inline handler", "descriptor.handler-in-public-metadata", { ...publicQuery, handler }],
    ["unknown transport field", "descriptor.unknown-public-field", { ...publicQuery, request: {} }],
    ["inline auth roles", "authorization.inline-role-forbidden", { ...publicQuery, auth: ["TEACHER"] }],
    ["destructive query", "classification.destructive-query-forbidden", { ...publicQuery, risk: "destructive" }],
    ["query idempotency", "idempotency.query-forbidden", {
      ...publicQuery,
      idempotency: {
        mode: "required",
        keySchema: z.string(),
        scope: "global-capability",
        retentionSeconds: 60,
        conflict: "reject",
      },
    }],
    ["query transaction", "transaction.query-must-be-none", {
      ...publicQuery,
      transaction: { mode: "required" },
    }],
    ["missing command transaction", "transaction.command-declaration-required", {
      ...command,
      transaction: undefined,
    }],
    ["zero timeout", "observability.invalid-timeout", {
      ...publicQuery,
      observability: { ...publicQuery.observability, timeoutMs: 0 },
    }],
    ["excessive timeout", "observability.invalid-timeout", {
      ...publicQuery,
      observability: { ...publicQuery.observability, timeoutMs: 3_600_001 },
    }],
    ["undeclared error mapping", "errors.undeclared-mapping", {
      ...publicQuery,
      errorMappings: { UNKNOWN: { httpStatus: 500 } },
    }],
  ])("rejects %s", (_name, ruleId, descriptor) => {
    const registry = createCapabilityRegistry(dependencies);

    expect(() => registry.register(registration(malformed(descriptor)))).toThrow(
      new RegExp(String(ruleId).replaceAll(".", "\\."), "u"),
    );
  });

  it.each([
    ["destructive operation without audit", "audit.destructive-requires-audit", {
      ...command,
      risk: "destructive",
      audit: { mode: "none" },
    }],
    ["security-sensitive query without audit", "audit.security-sensitive-requires-audit", {
      ...protectedQuery,
      risk: "security-sensitive",
      audit: { mode: "none" },
    }],
    ["retryable mutation without idempotency", "idempotency.retryable-mutation-required", {
      ...command,
      risk: "ordinary",
      errors: [{
        code: "LESSON_BUSY",
        safeMessage: "Lesson is busy.",
        retryable: true,
        transport: { httpStatus: 409, jobOutcome: "retry" },
      }],
      audit: { mode: "none" },
      idempotency: { mode: "none" },
    }],
    ["global operation with tenant key scope", "idempotency.global-tenant-mismatch", {
      ...command,
      auth: "public",
      authorization: { mode: "none" },
      tenancy: publicQuery.tenancy,
    }],
    ["tenant operation with global key scope", "idempotency.global-tenant-mismatch", {
      ...command,
      idempotency: {
        ...command.idempotency,
        scope: "global-capability",
      },
    }],
    ["duplicate error code", "errors.duplicate-code", {
      ...command,
      errors: [
        {
          code: "LESSON_BUSY",
          safeMessage: "Lesson is busy.",
          retryable: true,
          transport: { httpStatus: 409, jobOutcome: "retry" },
        },
        {
          code: "LESSON_BUSY",
          safeMessage: "Lesson remains busy.",
          retryable: true,
          transport: { httpStatus: 409, jobOutcome: "retry" },
        },
      ],
    }],
  ])("rejects %s", (_name, ruleId, descriptor) => {
    const registry = createCapabilityRegistry(dependencies);

    expect(() =>
      registry.register(registration(descriptor as CapabilityDescriptor)),
    ).toThrow(new RegExp(String(ruleId).replaceAll(".", "\\."), "u"));
  });

  it.each([
    ["command", command],
    ["job", job],
  ])("rejects an audited %s without durable idempotency", (_kind, descriptor) => {
    const registry = createCapabilityRegistry(dependencies);
    const withoutIdempotency = malformed({
      ...descriptor,
      idempotency: { mode: "none" },
    });

    expect(() => registry.register(registration(withoutIdempotency))).toThrow(
      /idempotency\.audited-mutation-required/u,
    );
  });

  it("rejects required audit without a metadata projector", () => {
    const registry = createCapabilityRegistry(dependencies);
    const missing = malformed({
      ...command,
      audit: {
        mode: "required",
        eventType: "curriculum.lesson.published",
        immutable: true,
      },
    });

    expect(() => registry.register(registration(missing))).toThrow(
      /audit\.metadata-projector-required/u,
    );
  });

  it("rejects public metadata that references a user-only policy", () => {
    const registry = createCapabilityRegistry(dependencies);
    const mismatch = {
      ...publicQuery,
      authorization: {
        mode: "policy" as const,
        policyId: "curriculum.lesson.read",
        parameterProjection: structuredProjection.reference,
      },
    } satisfies CapabilityDescriptor;

    expect(() => registry.register(registration(mismatch))).toThrow(
      /authorization\.public-policy-mismatch/u,
    );
  });

  it("rejects a missing authorization policy", () => {
    const registry = createCapabilityRegistry(dependencies);
    const missing = {
      ...protectedQuery,
      authorization: {
        mode: "policy" as const,
        policyId: "curriculum.lesson.missing",
      },
    } satisfies CapabilityDescriptor;

    expect(() => registry.register(registration(missing))).toThrow(
      /authorization\.missing-policy-reference/u,
    );
  });

  it("rejects an authorization registry result with a different policy ID", () => {
    const mismatchedDependencies = {
      ...dependencies,
      references: {
        ...references,
        authorizationPolicies: {
          getAuthorizationPolicy: () => ({
            policyId: "curriculum.lesson.other",
            authentication: "user" as const,
            parameterProjection: structuredProjection.reference,
          }),
        },
      },
    } satisfies CapabilityRegistryDependencies;
    const registry = createCapabilityRegistry(mismatchedDependencies);

    expect(() => registry.register(registration(protectedQuery))).toThrow(
      /registry\.reference-identity-mismatch/u,
    );
  });

  it("rejects an authorization registry result with a different parameter reference", () => {
    const mismatchedDependencies = {
      ...dependencies,
      references: {
        ...references,
        authorizationPolicies: {
          getAuthorizationPolicy: (policyId: string) => ({
            policyId,
            authentication: "user" as const,
            parameterProjection: {
              ...structuredProjection.reference,
              allowedKeys: ["other"],
            },
          }),
        },
      },
    } satisfies CapabilityRegistryDependencies;
    const registry = createCapabilityRegistry(mismatchedDependencies);

    expect(() => registry.register(registration(protectedQuery))).toThrow(
      /authorization\.parameter-projection-mismatch/u,
    );
  });

  it.each([
    ["projector ID", {
      ...structuredProjection.reference,
      projectorId: "curriculum.lesson.other",
    }],
    ["schema identity", {
      ...structuredProjection.reference,
      schemaIdentity: SHA_A,
    }],
    ["allowed keys", {
      ...structuredProjection.reference,
      allowedKeys: ["other"],
    }],
  ])("rejects a structured projector registry result with a different %s", (_name, reference) => {
    const mismatchedProjector = {
      ...structuredProjector,
      contract: { ...structuredProjector.contract, reference },
    } as typeof structuredProjector;
    const mismatchedDependencies = {
      ...dependencies,
      references: {
        ...references,
        structuredProjectors: { getProjector: () => mismatchedProjector },
      },
    } satisfies CapabilityRegistryDependencies;
    const registry = createCapabilityRegistry(mismatchedDependencies);

    expect(() => registry.register(registration(protectedQuery))).toThrow(
      /registry\.reference-identity-mismatch/u,
    );
  });

  it.each([
    ["projector ID", {
      ...auditProjection.reference,
      projectorId: "curriculum.lesson.other-audit",
    }],
    ["schema identity", {
      ...auditProjection.reference,
      schemaIdentity: SHA_A,
    }],
    ["allowed keys", {
      ...auditProjection.reference,
      allowedKeys: ["other"],
    }],
  ])("rejects an audit projector registry result with a different %s", (_name, reference) => {
    const mismatchedProjector = {
      ...auditProjector,
      contract: { ...auditProjector.contract, reference },
    } as typeof auditProjector;
    const mismatchedDependencies = {
      ...dependencies,
      references: {
        ...references,
        auditProjectors: { getAuditProjector: () => mismatchedProjector },
      },
    } satisfies CapabilityRegistryDependencies;
    const registry = createCapabilityRegistry(mismatchedDependencies);

    expect(() => registry.register(registration(command))).toThrow(
      /registry\.reference-identity-mismatch/u,
    );
  });

  it("rejects a tenant resolver registry result with a different resolver ID", () => {
    const mismatchedDependencies = {
      ...dependencies,
      references: {
        ...references,
        tenantResolvers: {
          getTenantResolver: () => ({
            resolverId: "auth.other-school",
            modes: ["school"] as const,
          }),
        },
      },
    } satisfies CapabilityRegistryDependencies;
    const registry = createCapabilityRegistry(mismatchedDependencies);

    expect(() => registry.register(registration(protectedQuery))).toThrow(
      /registry\.reference-identity-mismatch/u,
    );
  });

  it("rejects a global policy registry result with a different policy ID", () => {
    const mismatchedDependencies = {
      ...dependencies,
      references: {
        ...references,
        globalTenancyPolicies: {
          getGlobalTenancyPolicy: () => ({
            policyId: "curriculum.lesson.other-global",
            ownerPackage: "@reading-advantage/backend",
          }),
        },
      },
    } satisfies CapabilityRegistryDependencies;
    const registry = createCapabilityRegistry(mismatchedDependencies);

    expect(() => registry.register(registration(publicQuery))).toThrow(
      /registry\.reference-identity-mismatch/u,
    );
  });

  it.each([
    ["projector ID", {
      ...resourceProjector,
      projectorId: "curriculum.lesson.other-reference",
    }],
    ["schema identity", {
      ...resourceProjector,
      schemaIdentity: SHA_A,
    }],
  ])("rejects a resource projector registry result with a different %s", (_name, mismatchedProjector) => {
    const mismatchedDependencies = {
      ...dependencies,
      references: {
        ...references,
        resourceReferenceProjectors: {
          getResourceReferenceProjector: () =>
            mismatchedProjector as ResourceReferenceProjectorDefinition<unknown>,
        },
      },
    } satisfies CapabilityRegistryDependencies;
    const registry = createCapabilityRegistry(mismatchedDependencies);
    const referential = malformed({
      ...protectedQuery,
      tenancy: {
        mode: "referential",
        resolverId: "curriculum.lesson.owner",
        resourceReferenceProjectorId: "curriculum.lesson.reference",
        resourceReferenceSchemaIdentity: RESOURCE_REFERENCE_SCHEMA_IDENTITY,
        ownerScopePolicyId: "curriculum.lesson.read",
      },
    });

    expect(() => registry.register(registration(referential))).toThrow(
      /registry\.reference-identity-mismatch/u,
    );
  });

  it.each([
    ["projector ID", changedReference({ projectorId: "curriculum.lesson.missing" })],
    ["schema identity", changedReference({ schemaIdentity: SHA_A })],
    ["allowed keys", changedReference({ allowedKeys: ["other"] })],
  ])("rejects an audit %s mismatch", (_name, metadataProjection) => {
    const registry = createCapabilityRegistry(dependencies);
    const mismatch = {
      ...command,
      audit: { ...command.audit, metadataProjection },
    } satisfies CapabilityDescriptor;

    expect(() => registry.register(registration(mismatch))).toThrow(
      /registry\.unresolvable-schema/u,
    );
  });

  it.each([
    ["omission", undefined],
    ["projector ID", {
      ...structuredProjection.reference,
      projectorId: "curriculum.lesson.other",
    }],
    ["schema identity", {
      ...structuredProjection.reference,
      schemaIdentity: SHA_A,
    }],
    ["allowed keys", {
      ...structuredProjection.reference,
      allowedKeys: ["other"],
    }],
  ])("rejects authorization parameter projection %s", (_name, parameterProjection) => {
    const registry = createCapabilityRegistry(dependencies);
    const authorization = parameterProjection === undefined
      ? {
          mode: "policy",
          policyId: "curriculum.lesson.read",
        }
      : {
          mode: "policy",
          policyId: "curriculum.lesson.read",
          parameterProjection,
        };
    const mismatch = malformed({ ...protectedQuery, authorization });

    expect(() => registry.register(registration(mismatch))).toThrow(
      /authorization\.parameter-projection-mismatch/u,
    );
  });

  it.each([
    ["missing global policy", "tenancy.global-policy-required", { ...publicQuery, tenancy: { mode: "global", globalPolicyId: "missing.global" } }],
    ["missing school resolver", "tenancy.school-resolver-required", { ...protectedQuery, tenancy: { mode: "school", resolverId: "missing.school" } }],
    ["resolver approved for wrong mode", "tenancy.school-resolver-required", { ...protectedQuery, tenancy: { mode: "school", resolverId: "curriculum.lesson.owner" } }],
  ])("rejects %s", (_name, ruleId, descriptor) => {
    const registry = createCapabilityRegistry(dependencies);

    expect(() =>
      registry.register(registration(descriptor as CapabilityDescriptor)),
    ).toThrow(new RegExp(String(ruleId).replaceAll(".", "\\."), "u"));
  });

  it.each([
    ["missing referential owner policy", "tenancy.referential-owner-policy-required", {
      mode: "referential",
      resolverId: "curriculum.lesson.owner",
      resourceReferenceProjectorId: "curriculum.lesson.reference",
      resourceReferenceSchemaIdentity: RESOURCE_REFERENCE_SCHEMA_IDENTITY,
    }],
    ["missing referential projector", "registry.unresolvable-schema", {
      mode: "referential",
      resolverId: "curriculum.lesson.owner",
      resourceReferenceProjectorId: "curriculum.lesson.missing",
      resourceReferenceSchemaIdentity: RESOURCE_REFERENCE_SCHEMA_IDENTITY,
      ownerScopePolicyId: "curriculum.lesson.read",
    }],
  ])("rejects %s", (_name, ruleId, tenancy) => {
    const registry = createCapabilityRegistry(dependencies);
    const descriptor = malformed({
      ...protectedQuery,
      tenancy,
    });

    expect(() => registry.register(registration(descriptor))).toThrow(
      new RegExp(String(ruleId).replaceAll(".", "\\."), "u"),
    );
  });

  it("rejects an unresolved referential owner-scope policy", () => {
    const registry = createCapabilityRegistry(dependencies);
    const descriptor = malformed({
      ...protectedQuery,
      tenancy: {
        mode: "referential",
        resolverId: "curriculum.lesson.owner",
        resourceReferenceProjectorId: "curriculum.lesson.reference",
        resourceReferenceSchemaIdentity: RESOURCE_REFERENCE_SCHEMA_IDENTITY,
        ownerScopePolicyId: "curriculum.lesson.missing",
      },
    });

    expect(() => registry.register(registration(descriptor))).toThrow(
      /tenancy\.referential-owner-policy-required/u,
    );
  });

  it("rejects a referential resource projector schema-identity mismatch", () => {
    const registry = createCapabilityRegistry(dependencies);
    const descriptor = malformed({
      ...protectedQuery,
      tenancy: {
        mode: "referential",
        resolverId: "curriculum.lesson.owner",
        resourceReferenceProjectorId: "curriculum.lesson.reference",
        resourceReferenceSchemaIdentity: SHA_A,
        ownerScopePolicyId: "curriculum.lesson.read",
      },
    });

    expect(() => registry.register(registration(descriptor))).toThrow(
      /registry\.unresolvable-schema/u,
    );
  });

  it("rejects a global policy owned by another package", () => {
    const mismatchedDependencies = {
      ...dependencies,
      references: {
        ...references,
        globalTenancyPolicies: {
          getGlobalTenancyPolicy: (policyId: string) =>
            policyId === "curriculum.lesson.global"
              ? { policyId, ownerPackage: "@reading-advantage/other" }
              : undefined,
        },
      },
    } satisfies CapabilityRegistryDependencies;
    const registry = createCapabilityRegistry(mismatchedDependencies);

    expect(() => registry.register(registration(publicQuery))).toThrow(
      /tenancy\.global-policy-owner-mismatch/u,
    );
  });

  it.each([
    ["unregistered documented protocol", "transaction.external-call-protocol-unresolved", {
      mode: "explicit",
      isolation: "serializable",
      maxRetries: 1,
      externalCalls: "documented",
      externalCallProtocolRef: "curriculum.lesson.missing",
    }],
    ["protocol on forbidden external calls", "transaction.external-call-protocol-contradiction", {
      mode: "explicit",
      isolation: "serializable",
      maxRetries: 1,
      externalCalls: "forbidden",
      externalCallProtocolRef: "curriculum.lesson.outbox",
    }],
  ])("rejects %s", (_name, ruleId, transaction) => {
    const registry = createCapabilityRegistry(dependencies);
    const descriptor = malformed({ ...command, transaction });

    expect(() => registry.register(registration(descriptor))).toThrow(
      new RegExp(String(ruleId).replaceAll(".", "\\."), "u"),
    );
  });

  it("rejects non-positive idempotency retention", () => {
    const registry = createCapabilityRegistry(dependencies);
    const descriptor = malformed({
      ...command,
      idempotency: { ...command.idempotency, retentionSeconds: 0 },
    });

    expect(() => registry.register(registration(descriptor))).toThrow(
      /idempotency\.invalid-retention/u,
    );
  });

  it("rejects an unresolved observability projection", () => {
    const registry = createCapabilityRegistry(dependencies);
    const descriptor = {
      ...publicQuery,
      observability: {
        ...publicQuery.observability,
        attributeProjection: {
          ...structuredProjection.reference,
          allowedKeys: ["different"],
        },
      },
    } satisfies CapabilityDescriptor;

    expect(() => registry.register(registration(descriptor))).toThrow(
      /registry\.unresolvable-schema/u,
    );
  });

  it("rejects a source module outside its declared ownership", () => {
    const registry = createCapabilityRegistry(dependencies);

    expect(() =>
      registry.register(
        registration(publicQuery, "apps/sales-advantage/lib/direct.ts"),
      ),
    ).toThrow(/registry\.descriptor-outside-ownership-root/u);
  });

  it("sorts multiple registry entries deterministically by capability ID", () => {
    const registry = createCapabilityRegistry(dependencies);
    const zeta = { ...publicQuery, id: "curriculum.lesson.zeta" } satisfies CapabilityDescriptor;
    const alpha = { ...publicQuery, id: "curriculum.lesson.alpha" } satisfies CapabilityDescriptor;

    registry.register(registration(zeta));
    registry.register(registration(alpha));

    expect(registry.listDescriptors().map((descriptor) => descriptor.id)).toEqual([
      alpha.id,
      zeta.id,
    ]);
    expect(registry.snapshot().entries.map((entry) => entry.descriptor.id)).toEqual([
      alpha.id,
      zeta.id,
    ]);
  });

  it("returns deeply immutable handler-free registry metadata", () => {
    const registry = createCapabilityRegistry(dependencies);
    registry.register(registration(nestedMetadataCommand));

    const descriptors = registry.listDescriptors();
    const snapshot = registry.snapshot();
    const descriptor = registry.getDescriptor(nestedMetadataCommand.id);
    const snapshotDescriptor = snapshot.entries[0]?.descriptor;

    expect(descriptor).toBeDefined();
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(descriptors)).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.entries)).toBe(true);
    expect(Object.isFrozen(snapshot.entries[0])).toBe(true);
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen(descriptor?.owner)).toBe(true);
    expect(Object.isFrozen(descriptor?.authorization)).toBe(true);
    expect(Object.isFrozen(descriptor?.tenancy)).toBe(true);
    expect(Object.isFrozen(descriptor?.audit)).toBe(true);
    expect(Object.isFrozen(descriptor?.observability)).toBe(true);
    expect(Object.isFrozen(descriptor?.idempotency)).toBe(true);
    expect(Object.isFrozen(descriptor?.errors)).toBe(true);
    expect(Object.isFrozen(descriptor?.errors[0])).toBe(true);
    expect(Object.isFrozen(descriptor?.errors[0]?.transport)).toBe(true);
    expect(Object.isFrozen(descriptor?.errors[0]?.detailsProjection)).toBe(true);
    expect(Object.isFrozen(descriptor?.errors[0]?.detailsProjection?.allowedKeys)).toBe(true);
    expect(Object.isFrozen(
      descriptor?.authorization.mode === "policy"
        ? descriptor.authorization.parameterProjection
        : undefined,
    )).toBe(true);
    expect(Object.isFrozen(
      descriptor?.authorization.mode === "policy"
        ? descriptor.authorization.parameterProjection?.allowedKeys
        : undefined,
    )).toBe(true);
    expect(Object.isFrozen(
      descriptor?.audit.mode === "required"
        ? descriptor.audit.metadataProjection
        : undefined,
    )).toBe(true);
    expect(Object.isFrozen(
      descriptor?.audit.mode === "required"
        ? descriptor.audit.metadataProjection.allowedKeys
        : undefined,
    )).toBe(true);
    expect(Object.isFrozen(descriptor?.observability.attributeProjection)).toBe(true);
    expect(Object.isFrozen(
      descriptor?.observability.attributeProjection?.allowedKeys,
    )).toBe(true);
    expect(Object.isFrozen(snapshotDescriptor)).toBe(true);
    expect(Object.isFrozen(snapshotDescriptor?.errors)).toBe(true);
    expect(Object.isFrozen(snapshotDescriptor?.errors[0])).toBe(true);
    expect(Object.isFrozen(snapshotDescriptor?.errors[0]?.transport)).toBe(true);
    expect(Object.isFrozen(
      snapshotDescriptor?.errors[0]?.detailsProjection?.allowedKeys,
    )).toBe(true);
    expect(registry).not.toHaveProperty("getHandler");
  });

  it("protects every nested registered contract from source mutation", () => {
    const registry = createCapabilityRegistry(dependencies);
    const mutableDescriptor = {
      ...nestedMetadataCommand,
      errors: nestedMetadataCommand.errors.map((error) => ({
        ...error,
        transport: { ...error.transport },
        detailsProjection: error.detailsProjection === undefined
          ? undefined
          : {
              ...error.detailsProjection,
              allowedKeys: [...error.detailsProjection.allowedKeys],
            },
      })),
      authorization: {
        ...nestedMetadataCommand.authorization,
        parameterProjection: {
          ...nestedMetadataCommand.authorization.parameterProjection,
          allowedKeys: [
            ...nestedMetadataCommand.authorization.parameterProjection.allowedKeys,
          ],
        },
      },
      audit: {
        ...nestedMetadataCommand.audit,
        metadataProjection: {
          ...nestedMetadataCommand.audit.metadataProjection,
          allowedKeys: [...nestedMetadataCommand.audit.metadataProjection.allowedKeys],
        },
      },
      observability: {
        ...nestedMetadataCommand.observability,
        attributeProjection: {
          ...nestedMetadataCommand.observability.attributeProjection,
          allowedKeys: [
            ...nestedMetadataCommand.observability.attributeProjection.allowedKeys,
          ],
        },
      },
    };
    registry.register(registration(mutableDescriptor));

    for (const mutate of [
      () => { mutableDescriptor.errors.push({ ...mutableDescriptor.errors[0]! }); },
      () => { mutableDescriptor.errors[0]!.safeMessage = "Tampered error."; },
      () => { mutableDescriptor.errors[0]!.transport.httpStatus = 200; },
      () => { mutableDescriptor.errors[0]!.detailsProjection!.projectorId = "tampered.details"; },
      () => { mutableDescriptor.errors[0]!.detailsProjection!.allowedKeys.push("tampered"); },
      () => { mutableDescriptor.authorization.parameterProjection.allowedKeys.push("tampered"); },
      () => { mutableDescriptor.audit.metadataProjection.allowedKeys.push("tampered"); },
      () => { mutableDescriptor.observability.attributeProjection.allowedKeys.push("tampered"); },
    ]) {
      try {
        mutate();
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
      }
    }

    expect(registry.getDescriptor(nestedMetadataCommand.id)).toEqual(
      nestedMetadataCommand,
    );
    expect(registry.snapshot().entries[0]?.descriptor).toEqual(
      nestedMetadataCommand,
    );
  });

  it("protects registered metadata from source mutation after registration", () => {
    const registry = createCapabilityRegistry(dependencies);
    const mutableDescriptor = {
      ...publicQuery,
      owner: { ...publicQuery.owner },
      observability: { ...publicQuery.observability },
    } as unknown as CapabilityDescriptor & {
      id: string;
      summary: string;
      owner: { package: string; module: string };
      observability: {
        operationName: string;
        timeoutMs: number;
        cancellation: "supported";
        logLevel: "info";
      };
    };
    const originalId = mutableDescriptor.id;
    registry.register(registration(mutableDescriptor));

    for (const mutate of [
      () => { mutableDescriptor.id = "curriculum.lesson.tampered"; },
      () => { mutableDescriptor.summary = "Tampered metadata."; },
      () => { mutableDescriptor.owner.module = "tampered"; },
      () => { mutableDescriptor.observability.timeoutMs = 999_999; },
    ]) {
      try {
        mutate();
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
      }
    }

    expect(registry.getDescriptor(originalId)).toMatchObject({
      id: originalId,
      summary: publicQuery.summary,
      owner: publicQuery.owner,
      observability: publicQuery.observability,
    });
    expect(registry.getDescriptor("curriculum.lesson.tampered")).toBeUndefined();
  });
});
