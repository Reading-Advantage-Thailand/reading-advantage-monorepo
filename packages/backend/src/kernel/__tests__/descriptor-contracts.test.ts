import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import {
  capabilityDescriptorSchema,
  commandCapabilityDescriptorSchema,
  jobCapabilityDescriptorSchema,
  queryCapabilityDescriptorSchema,
  type CapabilityDescriptor,
  type CapabilityHandler,
} from "../contracts/descriptors.js";
import { RESOURCE_REFERENCE_SCHEMA_IDENTITY } from "../contracts/policies.js";
import { createAllowedProjectionContract } from "../contracts/projections.js";

const input = z.strictObject({ lessonId: z.string().min(1) });
const output = z.strictObject({ title: z.string().min(1) });
const auditProjection = createAllowedProjectionContract({
  projectorId: "curriculum.lesson.audit",
  shape: { resourceId: z.string() },
});

const common = {
  id: "curriculum.lesson.get",
  summary: "Returns one lesson visible to the current school.",
  owner: {
    package: "@reading-advantage/backend",
    module: "curriculum",
  },
  input,
  output,
  auth: "user" as const,
  risk: "ordinary" as const,
  authorization: {
    mode: "policy" as const,
    policyId: "curriculum.lesson.read",
  },
  tenancy: {
    mode: "school" as const,
    resolverId: "auth.school",
  },
  errors: [
    {
      code: "LESSON_NOT_FOUND",
      safeMessage: "Lesson not found.",
      retryable: false,
      transport: { httpStatus: 404, jobOutcome: "terminal" as const },
    },
  ],
  audit: { mode: "none" as const },
  observability: {
    operationName: "curriculum.lesson.get",
    timeoutMs: 2_000,
    cancellation: "supported" as const,
    logLevel: "info" as const,
  },
};

describe("capability descriptor contracts", () => {
  it("parses a strict query descriptor with runtime Zod contracts", () => {
    const descriptor = queryCapabilityDescriptorSchema.parse({
      ...common,
      kind: "query",
      transaction: { mode: "none" },
      idempotency: { mode: "none" },
    });

    expect(descriptor.kind).toBe("query");
    expect(descriptor.input.safeParse({ lessonId: "lesson-1" }).success).toBe(
      true,
    );
    expect(
      descriptor.input.safeParse({ lessonId: "lesson-1", schoolId: "forged" })
        .success,
    ).toBe(false);
  });

  it("parses command and job descriptors with explicit policies", () => {
    const command = commandCapabilityDescriptorSchema.parse({
      ...common,
      id: "curriculum.lesson.publish",
      kind: "command",
      risk: "security-sensitive",
      transaction: {
        mode: "explicit",
        isolation: "serializable",
        maxRetries: 2,
        externalCalls: "forbidden",
      },
      audit: {
        mode: "required",
        eventType: "curriculum.lesson.published",
        metadataProjection: auditProjection.reference,
        immutable: true,
      },
      idempotency: {
        mode: "required",
        keySchema: z.string().min(16).max(200),
        scope: "tenant-capability",
        retentionSeconds: 86_400,
        conflict: "reject",
      },
    });
    const job = jobCapabilityDescriptorSchema.parse({
      ...common,
      id: "curriculum.lesson.index",
      kind: "job",
      transaction: { mode: "none" },
      idempotency: {
        mode: "required",
        keySchema: z.string().min(1),
        scope: "tenant-capability",
        retentionSeconds: 86_400,
        conflict: "replay",
      },
    });

    expect(command.transaction.mode).toBe("explicit");
    expect(job.kind).toBe("job");
    expect(capabilityDescriptorSchema.safeParse(command).success).toBe(true);
    expect(capabilityDescriptorSchema.safeParse(job).success).toBe(true);
  });

  it("rejects unknown descriptor metadata and non-Zod contracts", () => {
    const descriptor = {
      ...common,
      kind: "query",
      transaction: { mode: "none" },
      idempotency: { mode: "none" },
    };

    expect(
      capabilityDescriptorSchema.safeParse({ ...descriptor, handler: () => 1 })
        .success,
    ).toBe(false);
    expect(
      capabilityDescriptorSchema.safeParse({ ...descriptor, input: {} }).success,
    ).toBe(false);
    expect(
      queryCapabilityDescriptorSchema.safeParse({
        ...descriptor,
        risk: "destructive",
      }).success,
    ).toBe(false);
  });

  it("keeps handlers as a separate typed execution contract", () => {
    type Input = z.infer<typeof input>;
    type Output = z.infer<typeof output>;
    const handler: CapabilityHandler<Input, Output> = async (_context, value) =>
      ({ title: value.lessonId });
    const descriptor: CapabilityDescriptor<Input, Output> = {
      ...common,
      kind: "query",
      transaction: { mode: "none" },
      idempotency: { mode: "none" },
    };

    expect("handler" in descriptor).toBe(false);
    expectTypeOf(handler).toBeFunction();
  });

  it("represents public global, optional-auth, and referential policies", () => {
    const publicGlobal = queryCapabilityDescriptorSchema.parse({
      ...common,
      id: "status.service.read",
      auth: "public",
      authorization: { mode: "none" },
      tenancy: {
        mode: "global",
        globalPolicyId: "platform.status.public",
      },
      kind: "query",
      transaction: { mode: "none" },
      idempotency: { mode: "none" },
    });
    const optionalGlobal = queryCapabilityDescriptorSchema.parse({
      ...common,
      id: "catalog.preview.read",
      auth: "optional",
      authorization: { mode: "none" },
      tenancy: {
        mode: "global",
        globalPolicyId: "catalog.preview.global",
      },
      kind: "query",
      transaction: { mode: "none" },
      idempotency: { mode: "none" },
    });
    const referential = queryCapabilityDescriptorSchema.parse({
      ...common,
      id: "classroom.student.read",
      tenancy: {
        mode: "referential",
        resolverId: "classroom.student.tenant",
        resourceReferenceProjectorId: "classroom.student.reference",
        resourceReferenceSchemaIdentity: RESOURCE_REFERENCE_SCHEMA_IDENTITY,
        ownerScopePolicyId: "classroom.student.owner",
      },
      kind: "query",
      transaction: { mode: "none" },
      idempotency: { mode: "none" },
    });

    expect(publicGlobal.auth).toBe("public");
    expect(optionalGlobal.auth).toBe("optional");
    expect(referential.tenancy.mode).toBe("referential");
    expect(publicGlobal.risk).toBe("ordinary");
  });
});
