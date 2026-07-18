import { z } from "zod";

import { platformErrorSchema, type PlatformErrorData } from "./errors.js";
import {
  capabilityIdSchema,
  schemaFingerprintSchema,
  zodSchemaContractSchema,
} from "./primitives.js";

/** Runtime contract for durable idempotency declarations. */
export const idempotencyConflictBehaviorSchema = z.enum(["reject", "replay"]);

/** Descriptor-declared behavior when a completed result already exists. */
export type IdempotencyConflictBehavior = z.infer<
  typeof idempotencyConflictBehaviorSchema
>;

/** Runtime contract for durable idempotency declarations. */
export const idempotencyPolicySchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("none") }),
  z.strictObject({
    mode: z.literal("required"),
    keySchema: zodSchemaContractSchema,
    scope: z.enum(["tenant-capability", "global-capability"]),
    retentionSeconds: z.number().int().positive().max(31_536_000),
    conflict: idempotencyConflictBehaviorSchema,
  }),
]);

/** Durable idempotency behavior declared by a capability. */
export type IdempotencyPolicy = z.infer<typeof idempotencyPolicySchema>;

/** Runtime contract for the durable namespace of an idempotency key. */
export const idempotencyNamespaceSchema = z
  .strictObject({
    capabilityId: capabilityIdSchema,
    scope: z.enum(["tenant-capability", "global-capability"]),
    tenantId: z.string().min(1).max(200).optional(),
  })
  .superRefine((namespace, context) => {
    const tenantRequired = namespace.scope === "tenant-capability";
    if (tenantRequired !== (namespace.tenantId !== undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tenantId"],
        message:
          "Tenant-capability scope requires a tenant and global scope forbids one.",
      });
    }
  });

/** Durable namespace that prevents cross-capability or cross-tenant key reuse. */
export type IdempotencyNamespace = z.infer<typeof idempotencyNamespaceSchema>;

/** Runtime contract for a fingerprint-only durable acquisition request. */
export const idempotencyAcquireRequestSchema = z.strictObject({
  namespace: idempotencyNamespaceSchema,
  keyFingerprint: schemaFingerprintSchema,
  inputFingerprint: schemaFingerprintSchema,
  retentionSeconds: z.number().int().positive().max(31_536_000),
});

/** Runtime contract for atomic idempotency acquisition outcomes. */
export const idempotencyAcquireResultSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("owner"),
    ownershipToken: z.string().min(1).max(500),
  }),
  z.strictObject({
    status: z.literal("replay"),
    output: z.unknown(),
  }),
  z.strictObject({
    status: z.literal("conflict"),
    code: z.string().regex(/^[A-Z][A-Z0-9_]+$/),
    retryable: z.boolean(),
  }),
]);

/** Atomic ownership, deterministic replay, or conflict result. */
export type IdempotencyAcquireResult<TOutput = unknown> =
  | Readonly<{ status: "owner"; ownershipToken: string }>
  | Readonly<{ status: "replay"; output: TOutput }>
  | Readonly<{ status: "conflict"; code: string; retryable: boolean }>;

/** Request used to atomically acquire a durable idempotency key. */
export interface IdempotencyAcquireRequest {
  /** Capability-and-tenant namespace for the key. */
  readonly namespace: Readonly<IdempotencyNamespace>;
  /** SHA-256 digest of a key already validated by the descriptor's key schema. */
  readonly keyFingerprint: z.infer<typeof schemaFingerprintSchema>;
  /** SHA-256 digest used to detect reuse of a key with a different input. */
  readonly inputFingerprint: z.infer<typeof schemaFingerprintSchema>;
  /** Requested durable retention in seconds. */
  readonly retentionSeconds: number;
}

/** Deterministic failed-ownership settlement supplied to the durable adapter. */
export interface IdempotencyFailureSettlement {
  /** Opaque token returned by a successful atomic acquisition. */
  readonly ownershipToken: string;
  /** Normalized boundary-safe failure being settled. */
  readonly error: Readonly<PlatformErrorData>;
  /** Exact durable action required for this failed attempt. */
  readonly disposition: "release" | "store-retryable" | "store-terminal";
}

/** Runtime contract for deterministic failed-ownership settlement. */
export const idempotencyFailureSettlementSchema = z.strictObject({
  ownershipToken: z.string().min(1).max(500),
  error: platformErrorSchema,
  disposition: z.enum(["release", "store-retryable", "store-terminal"]),
});

/** Durable adapter providing atomic idempotency ownership and settlement. */
export interface DurableIdempotencyPort {
  /**
   * Atomically acquires a key or returns its deterministic prior state.
   * @param request Namespaced, validated acquisition request.
   * @returns Ownership, replay, or conflict without ambiguous states.
   */
  acquire<TOutput>(
    request: Readonly<IdempotencyAcquireRequest>,
  ): Promise<IdempotencyAcquireResult<TOutput>>;

  /**
   * Atomically acquires a key with explicit completed-result behavior.
   * @param request Namespaced, validated acquisition request.
   * @param conflict Descriptor-declared reject or replay behavior.
   * @returns Ownership, permitted replay, or deterministic conflict.
   */
  acquireWithPolicy?<TOutput>(
    request: Readonly<IdempotencyAcquireRequest>,
    conflict: IdempotencyConflictBehavior,
  ): Promise<IdempotencyAcquireResult<TOutput>>;

  /**
   * Atomically stores the terminal successful result for an owned key.
   * @param ownershipToken Opaque token returned by a successful acquisition.
   * @param output Output already validated by the capability schema.
   * @returns Nothing after durable settlement.
   */
  complete<TOutput>(
    ownershipToken: string,
    output: TOutput,
  ): Promise<void>;

  /**
   * Atomically applies the executor-selected failure disposition.
   * @param settlement Owned token, normalized error, and deterministic action.
   * @returns Nothing after durable settlement.
   */
  fail(settlement: Readonly<IdempotencyFailureSettlement>): Promise<void>;
}
