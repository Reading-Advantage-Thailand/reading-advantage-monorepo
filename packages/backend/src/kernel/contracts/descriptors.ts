import { z } from "zod";

import { auditPolicySchema, type AuditPolicy } from "./audit.js";
import type { CapabilityExecutionContext } from "./context.js";
import { declaredErrorSchema, type DeclaredError } from "./errors.js";
import {
  idempotencyPolicySchema,
  type IdempotencyPolicy,
} from "./idempotency.js";
import {
  capabilityIdSchema,
  capabilityOwnerSchema,
  type CapabilityOwner,
  zodSchemaContractSchema,
} from "./primitives.js";
import {
  authenticationRequirementSchema,
  authorizationPolicySchema,
  observabilityPolicySchema,
  operationRiskSchema,
  queryOperationRiskSchema,
  tenancyPolicySchema,
  transactionPolicySchema,
  type AuthenticationRequirement,
  type AuthorizationPolicy,
  type ObservabilityPolicy,
  type OperationRisk,
  type QueryOperationRisk,
  type TenancyPolicy,
  type TransactionPolicy,
} from "./policies.js";

/** Runtime contract for a capability kind. */
export const capabilityKindSchema = z.enum(["query", "command", "job"]);

/** Supported capability execution kind. */
export type CapabilityKind = z.infer<typeof capabilityKindSchema>;

const descriptorFields = {
  id: capabilityIdSchema,
  summary: z.string().min(1).max(500),
  owner: capabilityOwnerSchema,
  input: zodSchemaContractSchema,
  output: zodSchemaContractSchema,
  auth: authenticationRequirementSchema,
  authorization: authorizationPolicySchema,
  tenancy: tenancyPolicySchema,
  errors: z.array(declaredErrorSchema).max(100),
  audit: auditPolicySchema,
  observability: observabilityPolicySchema,
};

/** Runtime contract for a query capability descriptor. */
export const queryCapabilityDescriptorSchema = z.strictObject({
  ...descriptorFields,
  kind: z.literal("query"),
  risk: queryOperationRiskSchema,
  transaction: z.strictObject({ mode: z.literal("none") }),
  idempotency: z.strictObject({ mode: z.literal("none") }),
});

/** Runtime contract for a command capability descriptor. */
export const commandCapabilityDescriptorSchema = z.strictObject({
  ...descriptorFields,
  kind: z.literal("command"),
  risk: operationRiskSchema,
  transaction: transactionPolicySchema,
  idempotency: idempotencyPolicySchema,
});

/** Runtime contract for a durable job capability descriptor. */
export const jobCapabilityDescriptorSchema = z.strictObject({
  ...descriptorFields,
  kind: z.literal("job"),
  risk: operationRiskSchema,
  transaction: transactionPolicySchema,
  idempotency: idempotencyPolicySchema,
});

/** Runtime contract for every public, handler-free capability descriptor. */
export const capabilityDescriptorSchema = z.discriminatedUnion("kind", [
  queryCapabilityDescriptorSchema,
  commandCapabilityDescriptorSchema,
  jobCapabilityDescriptorSchema,
]);

/** Common public metadata and runtime schemas of a capability descriptor. */
export interface CapabilityDescriptorBase<
  TInput,
  TOutput,
  TRisk extends OperationRisk = OperationRisk,
> {
  /** Globally unique stable capability identifier. */
  readonly id: string;
  /** Human-readable summary suitable for generated reference material. */
  readonly summary: string;
  /** Package and module that own the capability. */
  readonly owner: Readonly<CapabilityOwner>;
  /** Runtime source of truth for untrusted input. */
  readonly input: z.ZodType<TInput>;
  /** Runtime source of truth for handler output. */
  readonly output: z.ZodType<TOutput>;
  /** Authentication requirement enforced before tenant resolution. */
  readonly auth: AuthenticationRequirement;
  /** Reviewed operation risk used to enforce immutable audit requirements. */
  readonly risk: TRisk;
  /** Named authorization policy reference enforced by the executor. */
  readonly authorization: Readonly<AuthorizationPolicy>;
  /** Trusted tenancy policy enforced by the executor. */
  readonly tenancy: Readonly<TenancyPolicy>;
  /** Declared, safe errors that may cross an invocation boundary. */
  readonly errors: readonly Readonly<DeclaredError>[];
  /** Immutable audit policy enforced outside the handler. */
  readonly audit: Readonly<AuditPolicy>;
  /** Timeout, cancellation, logging, and tracing declaration. */
  readonly observability: Readonly<ObservabilityPolicy>;
}

/** Public query descriptor with read-only execution policies. */
export interface QueryCapabilityDescriptor<TInput, TOutput>
  extends CapabilityDescriptorBase<TInput, TOutput, QueryOperationRisk> {
  /** Discriminator for a read-only capability. */
  readonly kind: "query";
  /** Queries cannot open a mutation transaction. */
  readonly transaction: Readonly<{ mode: "none" }>;
  /** Queries cannot claim mutation idempotency. */
  readonly idempotency: Readonly<{ mode: "none" }>;
}

/** Public command descriptor with explicit mutation policies. */
export interface CommandCapabilityDescriptor<TInput, TOutput>
  extends CapabilityDescriptorBase<TInput, TOutput> {
  /** Discriminator for a synchronous mutation capability. */
  readonly kind: "command";
  /** Explicit transaction declaration for the command. */
  readonly transaction: Readonly<TransactionPolicy>;
  /** Durable idempotency declaration for the command. */
  readonly idempotency: Readonly<IdempotencyPolicy>;
}

/** Public durable-job descriptor with explicit mutation policies. */
export interface JobCapabilityDescriptor<TInput, TOutput>
  extends CapabilityDescriptorBase<TInput, TOutput> {
  /** Discriminator for an asynchronously executed durable job. */
  readonly kind: "job";
  /** Explicit transaction declaration for job-owned database work. */
  readonly transaction: Readonly<TransactionPolicy>;
  /** Durable idempotency declaration for restart-safe execution. */
  readonly idempotency: Readonly<IdempotencyPolicy>;
}

/** Handler-free public descriptor accepted by registry and generator contracts. */
export type CapabilityDescriptor<TInput = unknown, TOutput = unknown> =
  | QueryCapabilityDescriptor<TInput, TOutput>
  | CommandCapabilityDescriptor<TInput, TOutput>
  | JobCapabilityDescriptor<TInput, TOutput>;

/**
 * Typed handler signature stored privately by the future registry implementation.
 * @param context Executor-created context containing only scoped internal ports.
 * @param input Input already parsed by the descriptor's Zod schema.
 * @returns Output that the executor must validate before settlement.
 */
export type CapabilityHandler<TInput, TOutput> = (
  context: Readonly<CapabilityExecutionContext>,
  input: TInput,
) => Promise<TOutput>;
