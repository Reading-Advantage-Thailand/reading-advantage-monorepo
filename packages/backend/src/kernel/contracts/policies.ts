import { z } from "zod";

import {
  referenceIdSchema,
} from "./primitives.js";
import {
  computeProjectionSchemaIdentity,
  projectionReferenceSchema,
} from "./projections.js";

/** Runtime contract for capability authentication requirements. */
export const authenticationRequirementSchema = z.enum([
  "public",
  "optional",
  "user",
]);

/** Authentication requirement declared by a capability. */
export type AuthenticationRequirement = z.infer<
  typeof authenticationRequirementSchema
>;

/** Runtime contract for authorization policy references. */
export const authorizationPolicySchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("none") }),
  z.strictObject({
    mode: z.literal("policy"),
    policyId: referenceIdSchema,
    parameterProjection: projectionReferenceSchema.optional(),
  }),
]);

/** Named authorization policy declaration evaluated by the executor. */
export type AuthorizationPolicy = z.infer<typeof authorizationPolicySchema>;

/** Runtime contract for explicit global tenancy policy. */
export const globalTenancyPolicySchema = z.strictObject({
  mode: z.literal("global"),
  globalPolicyId: referenceIdSchema,
});

/** Runtime contract for school tenancy resolved from trusted identity state. */
export const schoolTenancyPolicySchema = z.strictObject({
  mode: z.literal("school"),
  resolverId: referenceIdSchema,
});

/** Runtime contract for referential tenancy resolved through an owner lookup. */
export const resourceReferenceShape = {
  resourceType: referenceIdSchema,
  resourceId: z.string().min(1).max(500),
} satisfies z.ZodRawShape;

/** Runtime contract for a fixed resource reference used in trusted owner lookup. */
export const resourceReferenceSchema = z.strictObject(resourceReferenceShape);

/** Computed identity of the fixed resource-reference schema. */
export const RESOURCE_REFERENCE_SCHEMA_IDENTITY =
  computeProjectionSchemaIdentity(resourceReferenceShape);

/** Runtime contract for referential tenancy resolved through an owner lookup. */
export const referentialTenancyPolicySchema = z.strictObject({
  mode: z.literal("referential"),
  resolverId: referenceIdSchema,
  resourceReferenceProjectorId: referenceIdSchema,
  resourceReferenceSchemaIdentity: z.literal(RESOURCE_REFERENCE_SCHEMA_IDENTITY),
  ownerScopePolicyId: referenceIdSchema,
});

/** Runtime contract for global, school, and referential tenancy modes. */
export const tenancyPolicySchema = z.discriminatedUnion("mode", [
  globalTenancyPolicySchema,
  schoolTenancyPolicySchema,
  referentialTenancyPolicySchema,
]);

/** Trusted tenancy declaration for a capability. */
export type TenancyPolicy = z.infer<typeof tenancyPolicySchema>;

/** Runtime contract for supported transaction isolation levels. */
export const transactionIsolationSchema = z.enum([
  "read-committed",
  "repeatable-read",
  "serializable",
]);

/** Transaction isolation level requested by a capability. */
export type TransactionIsolation = z.infer<
  typeof transactionIsolationSchema
>;

/** Runtime contract for explicit transaction behavior. */
export const transactionPolicySchema = z.union([
  z.strictObject({ mode: z.literal("none") }),
  z.strictObject({ mode: z.literal("required") }),
  z
    .strictObject({
      mode: z.literal("explicit"),
      isolation: transactionIsolationSchema,
      maxRetries: z.number().int().min(0).max(10),
      externalCalls: z.enum(["forbidden", "documented"]),
      externalCallProtocolRef: referenceIdSchema.optional(),
    })
    .superRefine((policy, context) => {
      if (
        policy.externalCalls === "documented" &&
        policy.externalCallProtocolRef === undefined
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["externalCallProtocolRef"],
          message: "Documented external calls require a protocol reference.",
        });
      }
      if (
        policy.externalCalls === "forbidden" &&
        policy.externalCallProtocolRef !== undefined
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["externalCallProtocolRef"],
          message: "Forbidden external calls cannot declare a protocol.",
        });
      }
    }),
]);

/** Transaction boundary declared by a capability. */
export type TransactionPolicy = z.infer<typeof transactionPolicySchema>;

/** Runtime contract for operation risk used to enforce audit requirements. */
export const operationRiskSchema = z.enum([
  "ordinary",
  "security-sensitive",
  "destructive",
]);

/** Operation risk classification reviewed with a capability descriptor. */
export type OperationRisk = z.infer<typeof operationRiskSchema>;

/** Runtime contract for query risk, which cannot be destructive. */
export const queryOperationRiskSchema = z.enum([
  "ordinary",
  "security-sensitive",
]);

/** Risk classification supported by a read-only query capability. */
export type QueryOperationRisk = z.infer<typeof queryOperationRiskSchema>;

/** Runtime contract for capability observability and cancellation metadata. */
export const observabilityPolicySchema = z.strictObject({
  operationName: referenceIdSchema,
  timeoutMs: z.number().int().positive().max(3_600_000),
  cancellation: z.enum(["supported", "deadline-only", "unsupported"]),
  logLevel: z.enum(["debug", "info", "warn"]),
  attributeProjection: projectionReferenceSchema.optional(),
});

/** Stable observability declaration attached to a capability. */
export type ObservabilityPolicy = z.infer<typeof observabilityPolicySchema>;
