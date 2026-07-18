import type {
  AuditMetadataProjectorRegistryReadHandle,
  ImmutableAuditPort,
} from "./contracts/audit.js";
import type {
  AuthenticationEvidence,
  AuthenticationPort,
  AuthorizationPort,
  CapabilityClock,
  CapabilityLogger,
  CapabilitySpan,
  ResourceReferenceProjectorRegistryReadHandle,
  ScopedAdapterAccess,
  TenantResolutionPort,
  TransactionPort,
} from "./contracts/context.js";
import type {
  CapabilityDescriptor,
  CapabilityHandler,
} from "./contracts/descriptors.js";
import type { DurableIdempotencyPort } from "./contracts/idempotency.js";
import type { AuthenticationRequirement } from "./contracts/policies.js";
import type {
  ProjectionReference,
  StructuredDataProjectorRegistryReadHandle,
} from "./contracts/projections.js";
import type {
  CapabilityRegistryReadHandle,
  CapabilityRegistrySnapshot,
} from "./contracts/registry.js";

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

/**
 * Creates the callable Red registry scaffold for the runtime implementation phase.
 * @param dependencies Exact ownership and reference registries required by registration.
 * @returns Opaque registry with intentionally unimplemented validation and storage.
 */
export function createCapabilityRegistry(
  _dependencies: Readonly<CapabilityRegistryDependencies>,
): CapabilityRuntimeRegistry {
  const emptySnapshot: CapabilityRegistrySnapshot = { entries: [] };
  return Object.freeze({
    [capabilityRuntimeRegistryBrand]: true as const,
    register: () => undefined,
    getDescriptor: () => undefined,
    listDescriptors: () => [],
    snapshot: () => emptySnapshot,
  });
}

/**
 * Creates the callable Red executor scaffold for the runtime implementation phase.
 * @param dependencies Ordered runtime ports and reviewed registries.
 * @returns Executor whose behavior remains intentionally unimplemented.
 */
export function createCapabilityExecutor(
  _dependencies: Readonly<CapabilityExecutorDependencies>,
): CapabilityExecutor {
  return Object.freeze({
    execute: async <TOutput>() => undefined as TOutput,
  });
}
