import { z } from "zod";

import {
  referenceIdSchema,
  structuredJsonObjectSchema,
} from "./primitives.js";
import {
  RESOURCE_REFERENCE_SCHEMA_IDENTITY,
  globalTenancyPolicySchema,
  referentialTenancyPolicySchema,
  resourceReferenceSchema,
  schoolTenancyPolicySchema,
  type TransactionPolicy,
} from "./policies.js";
import type { ValidatedProjectedData } from "./projections.js";

/** Runtime contract for transport-neutral authentication evidence. */
export const authenticationEvidenceSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("anonymous"),
  }),
  z.strictObject({
    kind: z.literal("session"),
    opaqueSessionRef: z.string().min(1).max(500),
  }),
  z.strictObject({
    kind: z.literal("job"),
    opaqueJobRef: z.string().min(1).max(500),
  }),
  z.strictObject({
    kind: z.literal("system"),
    principalId: z.string().min(1).max(200),
  }),
]);

/** Trusted authentication evidence supplied by runtime composition. */
export type AuthenticationEvidence = z.infer<
  typeof authenticationEvidenceSchema
>;

/** Runtime contract for an authenticated principal from the internal auth adapter. */
export const authenticatedPrincipalSchema = z.strictObject({
  userId: z.string().min(1).max(200),
  roles: z.array(z.string().min(1).max(100)).max(100),
  schoolId: z.string().min(1).max(200).nullable(),
  sessionId: z.string().min(1).max(200).optional(),
  attributes: structuredJsonObjectSchema.optional(),
});

/** Authenticated principal resolved from trusted server-side evidence. */
export type AuthenticatedPrincipal = z.infer<
  typeof authenticatedPrincipalSchema
>;

/** Runtime contract for a trusted, executor-resolved tenancy context. */
export const globalTrustedTenantSchema = z.strictObject({
  mode: z.literal("global"),
});

/** Runtime contract for trusted school tenancy. */
export const schoolTrustedTenantSchema = z.strictObject({
  mode: z.literal("school"),
  schoolId: z.string().min(1).max(200),
});

/** Runtime contract for school-owned referential tenancy. */
export const referentialTrustedTenantSchema = z.strictObject({
  mode: z.literal("referential"),
  schoolId: z.string().min(1).max(200),
  referenceId: z.string().min(1).max(200),
  ownerScopeReason: z.string().min(1).max(500),
});

/** Runtime contract for every trusted executor-resolved tenant mode. */
export const trustedTenantSchema = z.discriminatedUnion("mode", [
  globalTrustedTenantSchema,
  schoolTrustedTenantSchema,
  referentialTrustedTenantSchema,
]);

/** Trusted tenant context resolved without accepting frontend tenant authority. */
export type TrustedTenant = z.infer<typeof trustedTenantSchema>;

/** Runtime contract for fail-closed authorization decisions. */
export const authorizationDecisionSchema = z.discriminatedUnion("allowed", [
  z.strictObject({ allowed: z.literal(true) }),
  z.strictObject({
    allowed: z.literal(false),
    safeReasonCode: z.string().regex(/^[A-Z][A-Z0-9_]+$/),
  }),
]);

/** Explicit authorization decision returned by the policy adapter. */
export type AuthorizationDecision = z.infer<
  typeof authorizationDecisionSchema
>;

/** Runtime contract for a resource reference used in trusted owner lookup. */
export const tenantLookupReferenceSchema = resourceReferenceSchema;

/** Resource identity used to look up ownership without accepting tenant authority. */
export type TenantLookupReference = z.infer<
  typeof tenantLookupReferenceSchema
>;

/** Runtime contract for a global tenant-resolution request. */
export const globalTenantResolutionRequestSchema = z.strictObject({
  mode: z.literal("global"),
  policy: globalTenancyPolicySchema,
  principal: authenticatedPrincipalSchema.nullable(),
  correlationId: z.string().min(1).max(200),
});

/** Runtime contract for a school tenant-resolution request. */
export const schoolTenantResolutionRequestSchema = z.strictObject({
  mode: z.literal("school"),
  policy: schoolTenancyPolicySchema,
  principal: authenticatedPrincipalSchema.nullable(),
  correlationId: z.string().min(1).max(200),
});

/** Runtime contract requiring a reference for referential tenant resolution. */
export const referentialTenantResolutionRequestSchema = z.strictObject({
  mode: z.literal("referential"),
  policy: referentialTenancyPolicySchema,
  principal: authenticatedPrincipalSchema.nullable(),
  correlationId: z.string().min(1).max(200),
  resourceReference: tenantLookupReferenceSchema,
});

/** Runtime contract coupling tenant request mode, policy, and resource reference. */
export const tenantResolutionRequestSchema = z.discriminatedUnion("mode", [
  globalTenantResolutionRequestSchema,
  schoolTenantResolutionRequestSchema,
  referentialTenantResolutionRequestSchema,
]);

/** Supported tenant-resolution mode. */
export type TenancyMode = z.infer<typeof trustedTenantSchema>["mode"];

/** Trusted tenant result whose shape is constrained to the requested mode. */
export type TrustedTenantForMode<TMode extends TenancyMode> =
  TMode extends "global"
    ? z.infer<typeof globalTrustedTenantSchema>
    : TMode extends "school"
      ? z.infer<typeof schoolTrustedTenantSchema>
      : z.infer<typeof referentialTrustedTenantSchema>;

/** Request supplied to the internal authentication adapter. */
export interface AuthenticationRequest {
  /** Correlation identifier established before authentication. */
  readonly correlationId: string;
  /** Transport-neutral evidence supplied by trusted runtime composition. */
  readonly evidence: Readonly<AuthenticationEvidence>;
}

/** Internal, provider-neutral authentication adapter. */
export interface AuthenticationPort {
  /**
   * Resolves a principal from trusted evidence without exposing cookies or JWTs.
   * @param request Correlated, transport-neutral authentication request.
   * @returns The principal or null when no authenticated identity exists.
   */
  authenticate(
    request: Readonly<AuthenticationRequest>,
  ): Promise<Readonly<AuthenticatedPrincipal> | null>;
}

/** Request supplied to the trusted tenant resolver. */
export type TenantResolutionRequest<TMode extends TenancyMode> =
  TMode extends "global"
    ? z.infer<typeof globalTenantResolutionRequestSchema>
    : TMode extends "school"
      ? z.infer<typeof schoolTenantResolutionRequestSchema>
      : z.infer<typeof referentialTenantResolutionRequestSchema>;

/** Internal adapter that resolves tenancy from trusted server-side state. */
export interface TenantResolutionPort {
  /**
   * Resolves the tenant dictated by policy and trusted identity state.
   * @param request Mode-coupled policy, principal, correlation, and required reference.
   * @returns A trusted tenant context or a rejected promise on ambiguity.
   */
  resolve<TMode extends TenancyMode>(
    request: Readonly<TenantResolutionRequest<TMode>>,
  ): Promise<Readonly<TrustedTenantForMode<TMode>>>;
}

/**
 * Derives a resource-reference candidate from validated capability input.
 * @param input Capability input already validated by its descriptor schema.
 * @returns Untrusted resource-reference candidate, synchronously or asynchronously.
 */
export type ResourceReferenceProjector<TInput> = (
  input: Readonly<TInput>,
) => unknown | Promise<unknown>;

/** Registered referential projector paired with its reviewed schema identity. */
export interface ResourceReferenceProjectorDefinition<TInput> {
  /** Stable projector ID declared by referential tenancy policy. */
  readonly projectorId: string;
  /** Reviewed identity of the fixed resource-reference schema. */
  readonly schemaIdentity: typeof RESOURCE_REFERENCE_SCHEMA_IDENTITY;
  /** Produces an untrusted candidate that must parse as TenantLookupReference. */
  readonly project: ResourceReferenceProjector<TInput>;
}

/** Read-only registry for referential resource-reference projectors. */
export interface ResourceReferenceProjectorRegistryReadHandle {
  /**
   * Resolves the exact referential projector declared by policy.
   * @param projectorId Stable projector identifier.
   * @returns Matching projector definition, or undefined when unresolved.
   */
  getResourceReferenceProjector(
    projectorId: string,
  ): ResourceReferenceProjectorDefinition<unknown> | undefined;
}

/** Request supplied to a named authorization policy. */
export interface AuthorizationRequest {
  /** Stable policy identifier selected by descriptor metadata. */
  readonly policyId: string;
  /** Capability being authorized. */
  readonly capabilityId: string;
  /** Authenticated principal, if one exists. */
  readonly principal: Readonly<AuthenticatedPrincipal> | null;
  /** Trusted executor-resolved tenancy context. */
  readonly tenant: Readonly<TrustedTenant>;
  /** Validated capability input for resource-level authorization. */
  readonly input: unknown;
  /** Policy parameters validated by the descriptor-declared reviewed projection. */
  readonly parameters?: ValidatedProjectedData;
}

/** Internal adapter that evaluates named resource authorization policies. */
export interface AuthorizationPort {
  /**
   * Evaluates one registered policy and returns an explicit decision.
   * @param request Named policy request with trusted identity and tenancy.
   * @returns An explicit allow or deny decision; errors are treated as deny.
   */
  authorize(
    request: Readonly<AuthorizationRequest>,
  ): Promise<Readonly<AuthorizationDecision>>;
}

/** Opaque token that identifies an internal adapter contract by name. */
export interface AdapterToken<TAdapter> {
  /** Stable provider-neutral identifier of the internal adapter contract. */
  readonly id: string;
  /** Effect class used to deny unapproved network work inside transactions. */
  readonly effect: AdapterEffect;
  /** Compile-time-only variance marker for the adapter interface. */
  readonly adapterType?: TAdapter;
}

/** Runtime contract for adapter effect classes enforced by composition. */
export const adapterEffectSchema = z.enum(["local", "database", "network"]);

/** Effect class of a provider-neutral internal adapter. */
export type AdapterEffect = z.infer<typeof adapterEffectSchema>;

/** Scoped internal adapter access exposed to capability handlers. */
export interface ScopedAdapterAccess {
  /**
   * Resolves an internal adapter already scoped to the execution context.
   * @param token Provider-neutral token for the requested adapter contract.
   * @returns The scoped internal adapter implementation.
   */
  get<TAdapter>(token: Readonly<AdapterToken<TAdapter>>): TAdapter;
}

/** Structured logger accepting only reviewed projected attributes. */
export interface CapabilityLogger {
  /**
   * Records a debug event with reviewed projected attributes.
   * @param event Stable event name.
   * @param attributes Optional attributes validated by a reviewed projection.
   * @returns Nothing.
   */
  debug(event: string, attributes?: ValidatedProjectedData): void;
  /**
   * Records an informational event with reviewed projected attributes.
   * @param event Stable event name.
   * @param attributes Optional attributes validated by a reviewed projection.
   * @returns Nothing.
   */
  info(event: string, attributes?: ValidatedProjectedData): void;
  /**
   * Records a warning event with reviewed projected attributes.
   * @param event Stable event name.
   * @param attributes Optional attributes validated by a reviewed projection.
   * @returns Nothing.
   */
  warn(event: string, attributes?: ValidatedProjectedData): void;
}

/** Trace span available to capability handlers without exporter coupling. */
export interface CapabilitySpan {
  /**
   * Adds reviewed projected attributes to the current span.
   * @param attributes Attributes validated by a reviewed projection.
   * @returns Nothing.
   */
  setAttributes(attributes: ValidatedProjectedData): void;
}

/** Clock abstraction used for deterministic capability behavior and tests. */
export interface CapabilityClock {
  /**
   * Reads the current wall-clock instant.
   * @returns Current instant as an immutable Date value.
   */
  now(): Date;
}

/** Context passed to a validated capability handler by the executor. */
export interface CapabilityExecutionContext {
  /** Stable ID of the capability being executed. */
  readonly capabilityId: string;
  /** Correlation ID established before authentication and policy work. */
  readonly correlationId: string;
  /** Authenticated principal, or null for permitted anonymous execution. */
  readonly principal: Readonly<AuthenticatedPrincipal> | null;
  /** Trusted tenancy context resolved by the executor. */
  readonly tenant: Readonly<TrustedTenant>;
  /** Provider-neutral adapters scoped to this identity and tenant. */
  readonly adapters: ScopedAdapterAccess;
  /** Structured logger pre-bound to capability and correlation metadata. */
  readonly logger: CapabilityLogger;
  /** Trace span pre-bound to the current execution. */
  readonly span: CapabilitySpan;
  /** Cancellation signal governed by descriptor timeout policy. */
  readonly signal: AbortSignal;
  /** Deterministic clock supplied by runtime composition. */
  readonly clock: CapabilityClock;
}

/** Transaction-scoped dependencies exposed only inside a transaction callback. */
export interface TransactionContext {
  /** Internal adapters rebound to the active transaction. */
  readonly adapters: ScopedAdapterAccess;
}

/** Internal adapter that owns explicit transaction boundaries. */
export interface TransactionPort {
  /**
   * Runs a callback under the exact declared transaction policy.
   * @param policy Validated required or explicit transaction policy.
   * @param operation Work receiving only transaction-scoped dependencies.
   * @returns The callback result after successful commit.
   */
  run<TResult>(
    policy: Exclude<Readonly<TransactionPolicy>, Readonly<{ mode: "none" }>>,
    operation: (context: Readonly<TransactionContext>) => Promise<TResult>,
  ): Promise<TResult>;
}

/** Runtime contract for stable, effect-classified adapter tokens. */
export const adapterTokenSchema = z.strictObject({
  id: referenceIdSchema,
  effect: adapterEffectSchema,
});
