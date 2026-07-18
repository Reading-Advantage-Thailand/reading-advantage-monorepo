import { createHash } from "node:crypto";

import { z } from "zod";

import {
  auditAppendReceiptSchema,
  auditEventSchema,
  type AuditEvent,
  AuditMetadataProjectorRegistryReadHandle,
  ImmutableAuditPort,
} from "./contracts/audit.js";
import {
  authenticatedPrincipalSchema,
  authenticationEvidenceSchema,
  authorizationDecisionSchema,
  trustedTenantSchema,
  AuthenticationEvidence,
  AuthenticationPort,
  AuthorizationPort,
  CapabilityClock,
  CapabilityExecutionContext,
  CapabilityLogger,
  CapabilitySpan,
  ResourceReferenceProjectorRegistryReadHandle,
  ScopedAdapterAccess,
  TenantResolutionPort,
  TransactionPort,
  TrustedTenant,
} from "./contracts/context.js";
import {
  capabilityDescriptorSchema,
  CapabilityDescriptor,
  CapabilityHandler,
  CommandCapabilityDescriptor,
  JobCapabilityDescriptor,
  QueryCapabilityDescriptor,
} from "./contracts/descriptors.js";
import type { PlatformErrorData } from "./contracts/errors.js";
import {
  idempotencyAcquireRequestSchema,
  idempotencyAcquireResultSchema,
  type DurableIdempotencyPort,
} from "./contracts/idempotency.js";
import {
  RESOURCE_REFERENCE_SCHEMA_IDENTITY,
  resourceReferenceSchema,
} from "./contracts/policies.js";
import type { AuthenticationRequirement } from "./contracts/policies.js";
import type {
  ProjectionReference,
  StructuredDataProjectorRegistryReadHandle,
  ValidatedProjectedData,
} from "./contracts/projections.js";
import {
  capabilityRegistryEntrySchema,
  capabilityRegistrySnapshotSchema,
  CapabilityRegistryReadHandle,
  CapabilityRegistrySnapshot,
} from "./contracts/registry.js";
import {
  canonicalizeDurableValue,
  encodeDurableValue,
} from "./durable-value.js";

/** Reviewed authorization policy metadata used during registration. */
export interface AuthorizationPolicyDefinition {
  /** Stable identifier referenced by capability descriptors. */
  readonly policyId: string;
  /** Weakest authentication level under which the policy may run. */
  readonly authentication: AuthenticationRequirement;
  /** Exact reviewed parameter projection, when the policy accepts parameters. */
  readonly parameterProjection?: Readonly<ProjectionReference>;
}

/** Read-only registry for reviewed authorization policy definitions. */
export interface AuthorizationPolicyRegistryReadHandle {
  /**
   * Resolves one exact reviewed authorization policy.
   * @param policyId Stable policy identifier from a descriptor.
   * @returns Matching policy metadata, or undefined when unresolved.
   */
  getAuthorizationPolicy(
    policyId: string,
  ): Readonly<AuthorizationPolicyDefinition> | undefined;
}

/** Reviewed global tenancy policy metadata used during registration. */
export interface GlobalTenancyPolicyDefinition {
  /** Stable global-policy identifier from a descriptor. */
  readonly policyId: string;
  /** Owning package permitted to declare this global access. */
  readonly ownerPackage: string;
}

/** Read-only registry for explicit global tenancy policies. */
export interface GlobalTenancyPolicyRegistryReadHandle {
  /**
   * Resolves one explicit global tenancy policy.
   * @param policyId Stable global-policy identifier.
   * @returns Matching global policy, or undefined when unresolved.
   */
  getGlobalTenancyPolicy(
    policyId: string,
  ): Readonly<GlobalTenancyPolicyDefinition> | undefined;
}

/** Reviewed tenant resolver metadata used during registration. */
export interface TenantResolverDefinition {
  /** Stable resolver identifier from a descriptor. */
  readonly resolverId: string;
  /** Tenant modes this resolver is reviewed to produce. */
  readonly modes: readonly ("school" | "referential")[];
}

/** Read-only registry for trusted tenant resolver definitions. */
export interface TenantResolverRegistryReadHandle {
  /**
   * Resolves one trusted tenant resolver.
   * @param resolverId Stable resolver identifier.
   * @returns Matching resolver metadata, or undefined when unresolved.
   */
  getTenantResolver(
    resolverId: string,
  ): Readonly<TenantResolverDefinition> | undefined;
}

/** Read-only registry for reviewed external-call transaction protocols. */
export interface ExternalCallProtocolRegistryReadHandle {
  /**
   * Reports whether an exact protocol reference is registered.
   * @param protocolRef Stable protocol reference declared by a transaction.
   * @returns True only for a reviewed protocol.
   */
  hasExternalCallProtocol(protocolRef: string): boolean;
}

/** Ownership policy applied to descriptor source modules at registration. */
export interface CapabilityOwnershipPolicy {
  /**
   * Decides whether descriptor ownership and source module agree.
   * @param descriptor Handler-free descriptor being registered.
   * @param sourceModule Repository-relative module that owns the registration.
   * @returns True only when the source is inside an approved ownership root.
   */
  allows(
    descriptor: Readonly<CapabilityDescriptor>,
    sourceModule: string,
  ): boolean;
}

/** Exact registries required to resolve descriptor references at registration. */
export interface CapabilityRegistrationReferences {
  /** Reviewed authorization policies. */
  readonly authorizationPolicies: AuthorizationPolicyRegistryReadHandle;
  /** Explicit global tenancy policies. */
  readonly globalTenancyPolicies: GlobalTenancyPolicyRegistryReadHandle;
  /** Trusted school and referential tenant resolvers. */
  readonly tenantResolvers: TenantResolverRegistryReadHandle;
  /** Exact structured projectors for policy, error, and observability data. */
  readonly structuredProjectors: StructuredDataProjectorRegistryReadHandle;
  /** Exact immutable-audit metadata projectors. */
  readonly auditProjectors: AuditMetadataProjectorRegistryReadHandle;
  /** Exact referential resource-reference projectors. */
  readonly resourceReferenceProjectors: ResourceReferenceProjectorRegistryReadHandle;
  /** Reviewed protocols for explicitly documented external calls. */
  readonly externalCallProtocols: ExternalCallProtocolRegistryReadHandle;
}

/** Dependencies required to construct a capability runtime registry. */
export interface CapabilityRegistryDependencies {
  /** Source-module ownership policy. */
  readonly ownership: CapabilityOwnershipPolicy;
  /** Exact reviewed reference registries. */
  readonly references: CapabilityRegistrationReferences;
}

/** Private-handler registration supplied by backend composition. */
export interface CapabilityRegistration<TInput = unknown, TOutput = unknown> {
  /** Handler-free public descriptor. */
  readonly descriptor: Readonly<CapabilityDescriptor<TInput, TOutput>>;
  /** Executable handler retained behind the registry boundary. */
  readonly handler: CapabilityHandler<TInput, TOutput>;
  /** Repository-relative owning source module. */
  readonly sourceModule: string;
}

const capabilityRuntimeRegistryBrand = Symbol("capability-runtime-registry");

/** Opaque runtime registry whose public reads never expose handlers. */
export interface CapabilityRuntimeRegistry extends CapabilityRegistryReadHandle {
  /** Prevents construction outside the registry factory. */
  readonly [capabilityRuntimeRegistryBrand]: true;
  /**
   * Registers one descriptor and its privately retained handler.
   * @param registration Descriptor, handler, and auditable source module.
   * @returns Nothing after successful fail-closed registration.
   * @throws When metadata or any referenced contract is invalid or unresolved,
   * including an audited command or job without durable idempotency. Durable
   * ownership is required because post-commit audit failure cannot safely permit
   * a committed mutation to execute again.
   */
  register<TInput, TOutput>(
    registration: Readonly<CapabilityRegistration<TInput, TOutput>>,
  ): void;
}

/** Transport-neutral request to execute one registered capability. */
export interface CapabilityInvocation {
  /** Stable registered capability identifier. */
  readonly capabilityId: string;
  /** Untrusted input parsed only by the descriptor input schema. */
  readonly input: unknown;
  /** Trusted, transport-neutral authentication evidence. */
  readonly evidence: Readonly<AuthenticationEvidence>;
  /** Untrusted idempotency key, required only when declared by the descriptor. */
  readonly idempotencyKey?: unknown;
}

/** Dependencies required to construct the ordered capability executor. */
export interface CapabilityExecutorDependencies {
  /** Opaque runtime registry containing private handlers. */
  readonly registry: CapabilityRuntimeRegistry;
  /** Provider-neutral authentication adapter. */
  readonly authentication: AuthenticationPort;
  /** Trusted tenant resolver. */
  readonly tenancy: TenantResolutionPort;
  /** Named resource authorization adapter. */
  readonly authorization: AuthorizationPort;
  /** Explicit transaction boundary adapter. */
  readonly transactions: TransactionPort;
  /** Durable atomic idempotency adapter. */
  readonly idempotency: DurableIdempotencyPort;
  /**
   * Append-only immutable audit adapter invoked after transaction commit.
   * It is not transaction-scoped: an append failure cannot roll back committed
   * database work. Registration therefore rejects audited commands and jobs
   * without durable idempotency, and terminal settlement prevents their
   * re-execution after audit projection or append failure.
   * A successful receipt must identify the exact submitted event. Receipt
   * mismatch or durable idempotency completion failure is terminal after commit:
   * the executor must not repeat handler work and must attempt terminal failure
   * settlement for the acquired ownership token.
   */
  readonly audit: ImmutableAuditPort;
  /** Exact reviewed reference registries shared with registration. */
  readonly references: CapabilityRegistrationReferences;
  /** Provider-neutral adapters scoped by executor identity and tenancy. */
  readonly adapters: ScopedAdapterAccess;
  /** Structured capability logger. */
  readonly logger: CapabilityLogger;
  /** Current capability trace span. */
  readonly span: CapabilitySpan;
  /** Deterministic clock. */
  readonly clock: CapabilityClock;
  /** Creates a correlation identifier after successful input validation. */
  readonly createCorrelationId: () => string;
}

/** Ordered transport-neutral capability executor. */
export interface CapabilityExecutor {
  /**
   * Executes one capability through every declared policy stage.
   * @param invocation Capability ID, untrusted input, trusted evidence, and optional key.
   * @returns Descriptor-validated output.
   * @throws A boundary-safe platform error when execution cannot complete.
   */
  execute<TOutput = unknown>(
    invocation: Readonly<CapabilityInvocation>,
  ): Promise<TOutput>;
}

interface InternalRegistration {
  readonly descriptor: Readonly<CapabilityDescriptor>;
  readonly handler: CapabilityHandler<unknown, unknown>;
  readonly sourceModule: string;
}

const registryStorage = new WeakMap<
  CapabilityRuntimeRegistry,
  Map<string, InternalRegistration>
>();

function rejectRule(id: string): never {
  throw new Error(id);
}

function sameProjection(
  left: Readonly<ProjectionReference> | undefined,
  right: Readonly<ProjectionReference> | undefined,
): boolean {
  return left === undefined
    ? right === undefined
    : right !== undefined && left.projectorId === right.projectorId &&
      left.schemaIdentity === right.schemaIdentity &&
      left.allowedKeys.length === right.allowedKeys.length &&
      left.allowedKeys.every((key, index) => key === right.allowedKeys[index]);
}

function isZodSchema(value: unknown): value is z.ZodTypeAny {
  return value instanceof z.ZodType;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value !== "object" || value === null || isZodSchema(value) ||
      value instanceof AbortSignal) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function validateStructuredProjection(
  registry: StructuredDataProjectorRegistryReadHandle,
  reference: Readonly<ProjectionReference>,
): void {
  const definition = registry.getProjector(reference);
  if (definition === undefined) {
    rejectRule("registry.unresolvable-schema");
  }
  if (!sameProjection(reference, definition.contract.reference)) {
    rejectRule("registry.reference-identity-mismatch");
  }
}

function prevalidateDescriptor(candidate: unknown): void {
  if (typeof candidate !== "object" || candidate === null) {
    rejectRule("descriptor.unknown-public-field");
  }
  const value = candidate as Record<string, unknown>;
  if (!isZodSchema(value.input)) rejectRule("descriptor.input-not-zod");
  if (!isZodSchema(value.output)) rejectRule("descriptor.output-not-zod");
  if ("handler" in value || "invoke" in value) {
    rejectRule("descriptor.handler-in-public-metadata");
  }
  if (Array.isArray(value.auth)) rejectRule("authorization.inline-role-forbidden");
  if ("errorMappings" in value) rejectRule("errors.undeclared-mapping");
  if (value.kind === "query" && value.risk === "destructive") {
    rejectRule("classification.destructive-query-forbidden");
  }
  if (value.kind === "query" &&
      (value.idempotency as { mode?: unknown } | undefined)?.mode !== "none") {
    rejectRule("idempotency.query-forbidden");
  }
  if (value.kind === "query" &&
      (value.transaction as { mode?: unknown } | undefined)?.mode !== "none") {
    rejectRule("transaction.query-must-be-none");
  }
  if ((value.kind === "command" || value.kind === "job") &&
      value.transaction === undefined) {
    rejectRule("transaction.command-declaration-required");
  }
  const timeout = (value.observability as { timeoutMs?: unknown } | undefined)
    ?.timeoutMs;
  if (typeof timeout !== "number" || timeout <= 0 || timeout > 3_600_000) {
    rejectRule("observability.invalid-timeout");
  }
  const known = new Set([
    "id", "summary", "owner", "input", "output", "auth", "risk",
    "authorization", "tenancy", "errors", "audit", "observability", "kind",
    "transaction", "idempotency",
  ]);
  if (Object.keys(value).some((key) => !known.has(key))) {
    rejectRule("descriptor.unknown-public-field");
  }
}

function validateRegistration(
  candidate: unknown,
  sourceModule: string,
  dependencies: Readonly<CapabilityRegistryDependencies>,
): Readonly<CapabilityDescriptor> {
  prevalidateDescriptor(candidate);
  const parsed = capabilityDescriptorSchema.safeParse(candidate);
  if (!parsed.success) {
    const value = candidate as Record<string, unknown>;
    const audit = value.audit as {
      mode?: string;
      metadataProjection?: unknown;
    } | undefined;
    const idempotency = value.idempotency as {
      retentionSeconds?: unknown;
    } | undefined;
    const transaction = value.transaction as {
      externalCalls?: string;
      externalCallProtocolRef?: unknown;
    } | undefined;
    const tenancy = value.tenancy as {
      mode?: string;
      ownerScopePolicyId?: unknown;
      resourceReferenceSchemaIdentity?: unknown;
    } | undefined;
    if (audit?.mode === "required" && audit.metadataProjection === undefined) {
      rejectRule("audit.metadata-projector-required");
    }
    if (typeof idempotency?.retentionSeconds === "number" &&
        idempotency.retentionSeconds <= 0) {
      rejectRule("idempotency.invalid-retention");
    }
    if (transaction?.externalCalls === "forbidden" &&
        transaction.externalCallProtocolRef !== undefined) {
      rejectRule("transaction.external-call-protocol-contradiction");
    }
    if (tenancy?.mode === "referential" &&
        tenancy.ownerScopePolicyId === undefined) {
      rejectRule("tenancy.referential-owner-policy-required");
    }
    if (tenancy?.mode === "referential" &&
        tenancy.resourceReferenceSchemaIdentity !==
          RESOURCE_REFERENCE_SCHEMA_IDENTITY) {
      rejectRule("registry.unresolvable-schema");
    }
    rejectRule("descriptor.unknown-public-field");
  }
  const descriptor = parsed.data as CapabilityDescriptor;
  if (!dependencies.ownership.allows(descriptor, sourceModule)) {
    rejectRule("registry.descriptor-outside-ownership-root");
  }
  if ((descriptor.risk === "security-sensitive" ||
      descriptor.risk === "destructive") && descriptor.audit.mode === "none") {
    rejectRule(descriptor.risk === "destructive"
      ? "audit.destructive-requires-audit"
      : "audit.security-sensitive-requires-audit");
  }
  const errorCodes = descriptor.errors.map((error) => error.code);
  if (new Set(errorCodes).size !== errorCodes.length) {
    rejectRule("errors.duplicate-code");
  }
  if (descriptor.kind !== "query") {
    if (descriptor.audit.mode === "required" &&
        descriptor.idempotency.mode === "none") {
      rejectRule("idempotency.audited-mutation-required");
    }
    if (descriptor.errors.some((error) => error.retryable) &&
        descriptor.idempotency.mode === "none") {
      rejectRule("idempotency.retryable-mutation-required");
    }
    if (descriptor.idempotency.mode === "required") {
      const tenantScope = descriptor.tenancy.mode !== "global";
      if ((descriptor.idempotency.scope === "tenant-capability") !== tenantScope) {
        rejectRule("idempotency.global-tenant-mismatch");
      }
    }
  }

  if (descriptor.authorization.mode === "policy") {
    const definition = dependencies.references.authorizationPolicies
      .getAuthorizationPolicy(descriptor.authorization.policyId);
    if (definition === undefined) {
      rejectRule("authorization.missing-policy-reference");
    }
    if (definition.policyId !== descriptor.authorization.policyId) {
      rejectRule("registry.reference-identity-mismatch");
    }
    if (!sameProjection(
      definition.parameterProjection,
      descriptor.authorization.parameterProjection,
    )) {
      rejectRule("authorization.parameter-projection-mismatch");
    }
    if (descriptor.auth === "public" && definition.authentication === "user") {
      rejectRule("authorization.public-policy-mismatch");
    }
    if (descriptor.authorization.parameterProjection !== undefined) {
      validateStructuredProjection(
        dependencies.references.structuredProjectors,
        descriptor.authorization.parameterProjection,
      );
    }
  }

  if (descriptor.tenancy.mode === "global") {
    const definition = dependencies.references.globalTenancyPolicies
      .getGlobalTenancyPolicy(descriptor.tenancy.globalPolicyId);
    if (definition === undefined) rejectRule("tenancy.global-policy-required");
    if (definition.policyId !== descriptor.tenancy.globalPolicyId) {
      rejectRule("registry.reference-identity-mismatch");
    }
    if (definition.ownerPackage !== descriptor.owner.package) {
      rejectRule("tenancy.global-policy-owner-mismatch");
    }
  } else {
    const resolver = dependencies.references.tenantResolvers
      .getTenantResolver(descriptor.tenancy.resolverId);
    const expectedMode = descriptor.tenancy.mode;
    if (resolver === undefined || !resolver.modes.includes(expectedMode)) {
      rejectRule(expectedMode === "school"
        ? "tenancy.school-resolver-required"
        : "tenancy.referential-owner-policy-required");
    }
    if (resolver.resolverId !== descriptor.tenancy.resolverId) {
      rejectRule("registry.reference-identity-mismatch");
    }
    if (descriptor.tenancy.mode === "referential") {
      const policy = dependencies.references.authorizationPolicies
        .getAuthorizationPolicy(descriptor.tenancy.ownerScopePolicyId);
      if (policy === undefined ||
          policy.policyId !== descriptor.tenancy.ownerScopePolicyId) {
        rejectRule("tenancy.referential-owner-policy-required");
      }
      const projector = dependencies.references.resourceReferenceProjectors
        .getResourceReferenceProjector(
          descriptor.tenancy.resourceReferenceProjectorId,
        );
      if (projector === undefined) rejectRule("registry.unresolvable-schema");
      if (projector.projectorId !==
          descriptor.tenancy.resourceReferenceProjectorId) {
        rejectRule("registry.reference-identity-mismatch");
      }
      if (projector.schemaIdentity !==
          descriptor.tenancy.resourceReferenceSchemaIdentity) {
        rejectRule(projector.schemaIdentity === RESOURCE_REFERENCE_SCHEMA_IDENTITY
          ? "registry.unresolvable-schema"
          : "registry.reference-identity-mismatch");
      }
    }
  }

  if (descriptor.audit.mode === "required") {
    const projector = dependencies.references.auditProjectors
      .getAuditProjector(descriptor.audit.metadataProjection);
    if (projector === undefined) rejectRule("registry.unresolvable-schema");
    if (!sameProjection(
      descriptor.audit.metadataProjection,
      projector.contract.reference,
    )) {
      rejectRule("registry.reference-identity-mismatch");
    }
  }
  if (descriptor.observability.attributeProjection !== undefined) {
    validateStructuredProjection(
      dependencies.references.structuredProjectors,
      descriptor.observability.attributeProjection,
    );
  }
  for (const error of descriptor.errors) {
    if (error.detailsProjection !== undefined) {
      validateStructuredProjection(
        dependencies.references.structuredProjectors,
        error.detailsProjection,
      );
    }
  }
  if (descriptor.transaction.mode === "explicit") {
    const reference = descriptor.transaction.externalCallProtocolRef;
    if (descriptor.transaction.externalCalls === "documented" &&
        (reference === undefined ||
          !dependencies.references.externalCallProtocols
            .hasExternalCallProtocol(reference))) {
      rejectRule("transaction.external-call-protocol-unresolved");
    }
  }
  const entry = capabilityRegistryEntrySchema.parse({ descriptor, sourceModule });
  return deepFreeze(entry.descriptor) as Readonly<CapabilityDescriptor>;
}

/**
 * Defines and validates a handler-free query descriptor.
 * @param descriptor Query descriptor candidate.
 * @returns The validated immutable descriptor.
 */
export function defineQueryCapability<TInput, TOutput>(
  descriptor: QueryCapabilityDescriptor<TInput, TOutput>,
): Readonly<QueryCapabilityDescriptor<TInput, TOutput>> {
  return deepFreeze(capabilityDescriptorSchema.parse(descriptor)) as Readonly<
    QueryCapabilityDescriptor<TInput, TOutput>
  >;
}

/**
 * Defines and validates a handler-free command descriptor.
 * @param descriptor Command descriptor candidate.
 * @returns The validated immutable descriptor.
 */
export function defineCommandCapability<TInput, TOutput>(
  descriptor: CommandCapabilityDescriptor<TInput, TOutput>,
): Readonly<CommandCapabilityDescriptor<TInput, TOutput>> {
  return deepFreeze(capabilityDescriptorSchema.parse(descriptor)) as Readonly<
    CommandCapabilityDescriptor<TInput, TOutput>
  >;
}

/**
 * Defines and validates a handler-free durable-job descriptor.
 * @param descriptor Job descriptor candidate.
 * @returns The validated immutable descriptor.
 */
export function defineJobCapability<TInput, TOutput>(
  descriptor: JobCapabilityDescriptor<TInput, TOutput>,
): Readonly<JobCapabilityDescriptor<TInput, TOutput>> {
  return deepFreeze(capabilityDescriptorSchema.parse(descriptor)) as Readonly<
    JobCapabilityDescriptor<TInput, TOutput>
  >;
}

/**
 * Creates a fail-closed capability registry with private handler storage.
 * @param dependencies Exact ownership and reference registries required by registration.
 * @returns Opaque immutable registry exposing handler-free reads only.
 */
export function createCapabilityRegistry(
  dependencies: Readonly<CapabilityRegistryDependencies>,
): CapabilityRuntimeRegistry {
  const storage = new Map<string, InternalRegistration>();
  const registry: CapabilityRuntimeRegistry = Object.freeze({
    [capabilityRuntimeRegistryBrand]: true as const,
    register<TInput, TOutput>(
      registration: Readonly<CapabilityRegistration<TInput, TOutput>>,
    ) {
      const rawId = (registration.descriptor as { id?: unknown }).id;
      if (typeof rawId === "string" && storage.has(rawId)) {
        rejectRule("registry.duplicate-capability-id");
      }
      const descriptor = validateRegistration(
        registration.descriptor,
        registration.sourceModule,
        dependencies,
      );
      if (storage.has(descriptor.id)) {
        rejectRule("registry.duplicate-capability-id");
      }
      storage.set(descriptor.id, {
        descriptor,
        handler: registration.handler as CapabilityHandler<unknown, unknown>,
        sourceModule: registration.sourceModule,
      });
    },
    getDescriptor(capabilityId: string) {
      return storage.get(capabilityId)?.descriptor;
    },
    listDescriptors() {
      return Object.freeze(
        [...storage.values()]
          .sort((left, right) =>
            left.descriptor.id.localeCompare(right.descriptor.id))
          .map((entry) => entry.descriptor),
      );
    },
    snapshot() {
      const snapshot = capabilityRegistrySnapshotSchema.parse({
        entries: [...storage.values()]
          .sort((left, right) =>
            left.descriptor.id.localeCompare(right.descriptor.id))
          .map(({ descriptor, sourceModule }) => ({ descriptor, sourceModule })),
      });
      return deepFreeze(snapshot) as Readonly<CapabilityRegistrySnapshot>;
    },
  });
  registryStorage.set(registry, storage);
  return registry;
}

function platformError(
  code: string,
  message: string,
  retryable: boolean,
  correlationId?: string,
  details?: ValidatedProjectedData,
): PlatformErrorData {
  return deepFreeze({
    code,
    message,
    retryable,
    correlationId,
    details,
  }) as PlatformErrorData;
}

function internalError(correlationId?: string): PlatformErrorData {
  return platformError(
    "INTERNAL_ERROR",
    "The operation could not be completed.",
    false,
    correlationId,
  );
}

function fingerprint(value: unknown): `sha256:${string}` {
  return `sha256:${createHash("sha256")
    .update(canonicalizeDurableValue(value))
    .digest("hex")}`;
}

async function projectStructured(
  registry: StructuredDataProjectorRegistryReadHandle,
  reference: Readonly<ProjectionReference>,
  source: unknown,
): Promise<ValidatedProjectedData> {
  const definition = registry.getProjector(reference);
  if (definition === undefined ||
      !sameProjection(reference, definition.contract.reference)) {
    throw new Error("Unresolved projection");
  }
  return deepFreeze(
    definition.contract.validate(
      await definition.project(source as Readonly<unknown>),
    ),
  );
}

function createAuditActor(
  evidence: Readonly<AuthenticationEvidence>,
  principal: z.infer<typeof authenticatedPrincipalSchema> | null,
): AuditEvent["actor"] {
  if (principal !== null) return { type: "user", id: principal.userId };
  if (evidence.kind === "system") {
    return { type: "system", id: evidence.principalId };
  }
  return { type: "anonymous" };
}

function createAuditTenant(
  tenant: Readonly<TrustedTenant>,
): AuditEvent["tenant"] {
  if (tenant.mode === "referential") {
    return {
      mode: "referential",
      schoolId: tenant.schoolId,
      referenceId: tenant.referenceId,
    };
  }
  return tenant;
}

function restrictTransactionAdapters(
  base: ScopedAdapterAccess,
  allowNetwork: boolean,
): ScopedAdapterAccess {
  return Object.freeze({
    get<TAdapter>(token: Readonly<{
      id: string;
      effect: "local" | "database" | "network";
    }>) {
      if (token.effect === "network" && !allowNetwork) {
        throw platformError(
          "NETWORK_EFFECT_FORBIDDEN",
          "Network work is not permitted in this transaction.",
          false,
        );
      }
      return base.get(token) as TAdapter;
    },
  });
}

/**
 * Creates the ordered, fail-closed capability executor.
 * @param dependencies Provider-neutral execution ports and reviewed registries.
 * @returns Immutable transport-independent executor.
 */
export function createCapabilityExecutor(
  dependencies: Readonly<CapabilityExecutorDependencies>,
): CapabilityExecutor {
  const storage = registryStorage.get(dependencies.registry);
  if (storage === undefined) {
    throw new Error("Unknown capability registry implementation.");
  }
  const internalStorage = storage;

  async function execute<TOutput>(
    invocation: Readonly<CapabilityInvocation>,
  ): Promise<TOutput> {
    const registered = internalStorage.get(invocation.capabilityId);
    if (registered === undefined) {
      throw platformError(
        "CAPABILITY_NOT_FOUND",
        "Capability not found.",
        false,
      );
    }
    const descriptor = registered.descriptor;
    const inputResult = descriptor.input.safeParse(invocation.input);
    if (!inputResult.success) {
      throw platformError("INVALID_INPUT", "Input is invalid.", false);
    }
    const input = inputResult.data;
    const correlationId = dependencies.createCorrelationId();

    try {
      if (descriptor.observability.attributeProjection !== undefined) {
        const attributes = await projectStructured(
          dependencies.references.structuredProjectors,
          descriptor.observability.attributeProjection,
          input,
        );
        dependencies.logger[descriptor.observability.logLevel](
          descriptor.observability.operationName,
          attributes,
        );
        dependencies.span.setAttributes(attributes);
      }
    } catch {
      throw internalError(correlationId);
    }

    const evidenceResult = authenticationEvidenceSchema.safeParse(
      invocation.evidence,
    );
    if (!evidenceResult.success) {
      throw platformError(
        "INVALID_AUTHENTICATION_EVIDENCE",
        "Authentication evidence is invalid.",
        false,
        correlationId,
      );
    }
    const evidence = evidenceResult.data;
    let principal: z.infer<typeof authenticatedPrincipalSchema> | null = null;
    if (descriptor.auth !== "public") {
      try {
        const candidate = await dependencies.authentication.authenticate({
          correlationId,
          evidence,
        });
        const parsed = authenticatedPrincipalSchema.nullable().safeParse(candidate);
        if (!parsed.success) throw new Error("Malformed principal");
        principal = parsed.data;
      } catch {
        throw internalError(correlationId);
      }
      if (descriptor.auth === "user" && principal === null) {
        throw platformError(
          "UNAUTHENTICATED",
          "Authentication is required.",
          false,
          correlationId,
        );
      }
    }

    let tenant: TrustedTenant;
    try {
      let candidate: unknown;
      if (descriptor.tenancy.mode === "referential") {
        const projector = dependencies.references.resourceReferenceProjectors
          .getResourceReferenceProjector(
            descriptor.tenancy.resourceReferenceProjectorId,
          );
        if (projector === undefined ||
            projector.projectorId !==
              descriptor.tenancy.resourceReferenceProjectorId ||
            projector.schemaIdentity !==
              descriptor.tenancy.resourceReferenceSchemaIdentity) {
          throw new Error("Unresolved resource projector");
        }
        const reference = resourceReferenceSchema.parse(
          await projector.project(input as Readonly<unknown>),
        );
        candidate = await dependencies.tenancy.resolve({
          mode: "referential",
          policy: descriptor.tenancy,
          principal,
          correlationId,
          resourceReference: reference,
        });
      } else if (descriptor.tenancy.mode === "school") {
        candidate = await dependencies.tenancy.resolve({
          mode: "school",
          policy: descriptor.tenancy,
          principal,
          correlationId,
        });
      } else {
        candidate = await dependencies.tenancy.resolve({
          mode: "global",
          policy: descriptor.tenancy,
          principal,
          correlationId,
        });
      }
      tenant = trustedTenantSchema.parse(candidate);
      if (tenant.mode !== descriptor.tenancy.mode) {
        throw new Error("Tenant mode mismatch");
      }
    } catch {
      throw platformError(
        "TENANT_RESOLUTION_FAILED",
        "Tenant context could not be resolved.",
        false,
        correlationId,
      );
    }

    let parameters: ValidatedProjectedData | undefined;
    if (descriptor.authorization.mode === "policy" &&
        descriptor.authorization.parameterProjection !== undefined) {
      try {
        parameters = await projectStructured(
          dependencies.references.structuredProjectors,
          descriptor.authorization.parameterProjection,
          input,
        );
      } catch {
        throw platformError("FORBIDDEN", "Access is denied.", false, correlationId);
      }
    }

    let denied = false;
    if (descriptor.authorization.mode === "policy") {
      try {
        const candidate = await dependencies.authorization.authorize({
          policyId: descriptor.authorization.policyId,
          capabilityId: descriptor.id,
          principal,
          tenant,
          input,
          parameters,
        });
        const decision = authorizationDecisionSchema.parse(candidate);
        denied = !decision.allowed;
      } catch {
        denied = true;
      }
    }

    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      descriptor.observability.timeoutMs,
    );
    const baseContext = {
      capabilityId: descriptor.id,
      correlationId,
      principal,
      tenant,
      adapters: dependencies.adapters,
      logger: dependencies.logger,
      span: dependencies.span,
      signal: abortController.signal,
      clock: dependencies.clock,
    } satisfies CapabilityExecutionContext;

    const appendAudit = async (
      outcome: AuditEvent["outcome"],
    ): Promise<void> => {
      if (descriptor.audit.mode === "none") return;
      const definition = dependencies.references.auditProjectors
        .getAuditProjector(descriptor.audit.metadataProjection);
      if (definition === undefined || !sameProjection(
        descriptor.audit.metadataProjection,
        definition.contract.reference,
      )) {
        throw new Error("Unresolved audit projection");
      }
      const metadata = deepFreeze(
        definition.contract.validate(
          await definition.project(input as Readonly<unknown>),
        ),
      );
      const now = dependencies.clock.now().toISOString();
      const event = deepFreeze(auditEventSchema.parse({
        eventId: fingerprint({
          capabilityId: descriptor.id,
          correlationId,
          outcome,
          now,
        }),
        eventType: descriptor.audit.eventType,
        occurredAt: now,
        capabilityId: descriptor.id,
        correlationId,
        actor: createAuditActor(evidence, principal),
        tenant: createAuditTenant(tenant),
        outcome,
        metadata,
      })) as unknown as AuditEvent;
      const receipt = auditAppendReceiptSchema.parse(
        await dependencies.audit.append(event),
      );
      if (receipt.eventId !== event.eventId) {
        throw new Error("Audit receipt mismatch");
      }
    };

    if (denied) {
      try {
        await appendAudit("denied");
      } catch {
        throw internalError(correlationId);
      } finally {
        clearTimeout(timeout);
      }
      throw platformError("FORBIDDEN", "Access is denied.", false, correlationId);
    }

    let ownershipToken: string | undefined;
    if (descriptor.idempotency.mode === "required") {
      const key = descriptor.idempotency.keySchema.safeParse(
        invocation.idempotencyKey,
      );
      if (!key.success) {
        clearTimeout(timeout);
        throw platformError(
          "INVALID_IDEMPOTENCY_KEY",
          "Idempotency key is invalid.",
          false,
          correlationId,
        );
      }
      let request: z.infer<typeof idempotencyAcquireRequestSchema>;
      try {
        const parsedRequest = idempotencyAcquireRequestSchema.parse({
          namespace: {
            capabilityId: descriptor.id,
            scope: descriptor.idempotency.scope,
            tenantId: tenant.mode === "global" ? undefined : tenant.schoolId,
          },
          keyFingerprint: fingerprint(key.data),
          inputFingerprint: fingerprint(input),
          retentionSeconds: descriptor.idempotency.retentionSeconds,
        });
        request = parsedRequest;
      } catch {
        clearTimeout(timeout);
        throw internalError(correlationId);
      }
      let acquisition: z.infer<typeof idempotencyAcquireResultSchema>;
      try {
        acquisition = idempotencyAcquireResultSchema.parse(
          await (dependencies.idempotency.acquireWithPolicy === undefined
            ? dependencies.idempotency.acquire(request)
            : dependencies.idempotency.acquireWithPolicy(
                request,
                descriptor.idempotency.conflict,
              )),
        );
      } catch {
        clearTimeout(timeout);
        throw internalError(correlationId);
      }
      if (acquisition.status === "conflict") {
        clearTimeout(timeout);
        throw platformError(
          acquisition.code,
          "The idempotency key conflicts with another operation.",
          acquisition.retryable,
          correlationId,
        );
      }
      if (acquisition.status === "replay") {
        clearTimeout(timeout);
        if (descriptor.idempotency.conflict !== "replay") {
          throw platformError(
            "IDEMPOTENCY_REPLAY_REJECTED",
            "The idempotency key conflicts with another operation.",
            false,
            correlationId,
          );
        }
        const replay = descriptor.output.safeParse(acquisition.output);
        if (!replay.success) throw internalError(correlationId);
        return replay.data as TOutput;
      }
      ownershipToken = acquisition.ownershipToken;
    }

    const normalizeFailure = async (
      error: unknown,
    ): Promise<PlatformErrorData> => {
      if (typeof error === "object" && error !== null &&
          "code" in error && error.code === "NETWORK_EFFECT_FORBIDDEN") {
        return error as PlatformErrorData;
      }
      if (abortController.signal.aborted) {
        return platformError(
          "TIMEOUT",
          "The operation timed out.",
          false,
          correlationId,
        );
      }
      if (typeof error === "object" && error !== null && "code" in error) {
        const declaration = descriptor.errors.find(
          (item) => item.code === error.code,
        );
        if (declaration !== undefined) {
          let details: ValidatedProjectedData | undefined;
          if (declaration.detailsProjection !== undefined && "details" in error) {
            try {
              details = await projectStructured(
                dependencies.references.structuredProjectors,
                declaration.detailsProjection,
                error.details,
              );
            } catch {
              details = undefined;
            }
          }
          return platformError(
            declaration.code,
            declaration.safeMessage,
            declaration.retryable,
            correlationId,
            details,
          );
        }
      }
      return internalError(correlationId);
    };

    const runHandler = async (
      adapters: ScopedAdapterAccess,
    ): Promise<unknown> => {
      const context = deepFreeze({
        ...baseContext,
        adapters,
      }) as Readonly<CapabilityExecutionContext>;
      const operation = registered.handler(context, input);
      const abort = new Promise<never>((_resolve, reject) => {
        abortController.signal.addEventListener(
          "abort",
          () => reject(new Error("timeout")),
          { once: true },
        );
      });
      const output = await Promise.race([operation, abort]);
      const parsedOutput = descriptor.output.parse(output);
      if (descriptor.idempotency.mode === "required") {
        encodeDurableValue(parsedOutput);
      }
      return parsedOutput;
    };

    let output: unknown;
    let committed = false;
    try {
      if (descriptor.transaction.mode === "none") {
        output = await runHandler(dependencies.adapters);
      } else {
        const completionToken = Object.freeze({ completed: true });
        let callbackCount = 0;
        let callbackCompleted = false;
        let callbackOutput: unknown;
        const transactionResult = await dependencies.transactions.run(
          descriptor.transaction,
          async (transaction) => {
            callbackCount += 1;
            if (callbackCount !== 1) {
              throw new Error("Transaction callback invoked more than once.");
            }
            callbackOutput = await runHandler(restrictTransactionAdapters(
              transaction.adapters,
              descriptor.transaction.mode === "explicit" &&
                descriptor.transaction.externalCalls === "documented",
            ));
            callbackCompleted = true;
            return completionToken;
          },
        );
        if (callbackCount !== 1 || !callbackCompleted ||
            transactionResult !== completionToken) {
          throw new Error("Transaction callback contract was not honored.");
        }
        output = callbackOutput;
      }
      committed = true;
    } catch (error) {
      const normalized = await normalizeFailure(error);
      try {
        await appendAudit("failure");
      } catch {
        // Preserve the original boundary-safe operation failure.
      }
      if (ownershipToken !== undefined) {
        try {
          await dependencies.idempotency.fail({
            ownershipToken,
            error: normalized,
            disposition: normalized.retryable
              ? "store-retryable"
              : "store-terminal",
          });
        } catch {
          // Settlement adapters cannot make the exposed error less safe.
        }
      }
      clearTimeout(timeout);
      throw normalized;
    }

    try {
      await appendAudit("success");
      if (ownershipToken !== undefined) {
        await dependencies.idempotency.complete(ownershipToken, output);
      }
      clearTimeout(timeout);
      return output as TOutput;
    } catch {
      const normalized = internalError(correlationId);
      if (committed && ownershipToken !== undefined) {
        try {
          await dependencies.idempotency.fail({
            ownershipToken,
            error: normalized,
            disposition: "store-terminal",
          });
        } catch {
          // Preserve safe terminal semantics if fallback settlement also fails.
        }
      }
      clearTimeout(timeout);
      throw normalized;
    }
  }

  const observedExecute = <TOutput>(
    invocation: Readonly<CapabilityInvocation>,
  ): Promise<TOutput> => {
    const operation = execute<TOutput>(invocation);
    void operation.catch(() => undefined);
    return operation;
  };

  return Object.freeze({ execute: observedExecute });
}
