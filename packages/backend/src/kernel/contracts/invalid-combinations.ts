import { z } from "zod";

/** Runtime contract for one unsupported kernel policy combination. */
export const invalidCombinationRuleSchema = z.strictObject({
  id: z.string().regex(/^[a-z]+(?:[.-][a-z]+)+$/),
  phase: z.enum(["registration", "generation", "execution"]),
  target: z.enum(["descriptor", "registry", "catalog", "binding", "context"]),
  condition: z.string().min(1).max(500),
  rationale: z.string().min(1).max(500),
});

/** Auditable definition of one fail-closed unsupported combination. */
export type InvalidCombinationRule = z.infer<
  typeof invalidCombinationRuleSchema
>;

/**
 * Complete design-time counterexample matrix for registration and generation.
 * The future registry/executor/generator phases must implement every row.
 */
export const INVALID_CAPABILITY_COMBINATIONS = [
  { id: "audit.destructive-requires-audit", phase: "registration", target: "descriptor", condition: "A destructive command or job declares audit mode none.", rationale: "Destructive operations require immutable evidence." },
  { id: "audit.metadata-projector-required", phase: "registration", target: "descriptor", condition: "Required audit policy omits its registered metadata projector.", rationale: "Handlers cannot choose or bypass safe audit projection." },
  { id: "audit.security-sensitive-requires-audit", phase: "registration", target: "descriptor", condition: "A security-sensitive capability declares audit mode none, including a security-sensitive query.", rationale: "Security-sensitive outcomes require immutable evidence." },
  { id: "audit.sensitive-metadata-forbidden", phase: "execution", target: "context", condition: "Projected audit metadata contains a credential, secret, token, stack, SQL, or session field.", rationale: "Audit records must remain allowlisted and secret-safe." },
  { id: "authorization.inline-role-forbidden", phase: "registration", target: "descriptor", condition: "Authorization is expressed as inline roles instead of a named policy reference.", rationale: "Resource authorization belongs in replaceable permission modules." },
  { id: "authorization.missing-policy-reference", phase: "registration", target: "descriptor", condition: "A protected capability declares policy authorization without a resolvable policy ID.", rationale: "Authorization must fail closed when policy wiring is absent." },
  { id: "authorization.public-policy-mismatch", phase: "registration", target: "descriptor", condition: "A public capability references a policy that requires an authenticated user.", rationale: "Public metadata cannot contradict its named policy." },
  { id: "binding.auth-exposure-mismatch", phase: "generation", target: "binding", condition: "Binding exposure is weaker or stronger than the descriptor authentication declaration.", rationale: "Generated transports must preserve descriptor authentication semantics." },
  { id: "binding.duplicate-binding-id", phase: "generation", target: "binding", condition: "Two binding declarations share a binding ID.", rationale: "Every generated binding must resolve deterministically." },
  { id: "binding.duplicate-method-path", phase: "generation", target: "binding", condition: "Two HTTP declarations share a method and path, including across HTTP adapters.", rationale: "Ambiguous routes cannot be generated safely." },
  { id: "binding.job-synchronous", phase: "generation", target: "binding", condition: "A job capability is bound to HTTP, tRPC, or synchronous CLI invocation.", rationale: "Long-running work must enter through a durable asynchronous boundary." },
  { id: "binding.kind-transport-mismatch", phase: "generation", target: "binding", condition: "A query uses a mutation procedure, a command uses a query procedure, or a non-job uses a worker binding.", rationale: "Transport semantics must match capability kind." },
  { id: "binding.missing-capability", phase: "generation", target: "binding", condition: "An explicit binding references no registered capability ID.", rationale: "Thin bindings may invoke only a known executor capability." },
  { id: "binding.public-nonpublic-capability", phase: "generation", target: "binding", condition: "A public binding references an optional, user, or internal-only capability.", rationale: "Generation cannot weaken capability exposure." },
  { id: "catalog.nondeterministic-order", phase: "generation", target: "catalog", condition: "Capabilities, legacy routes, or bindings are not sorted by stable identifier.", rationale: "Generated artifacts must be byte-deterministic." },
  { id: "catalog.stale-output", phase: "generation", target: "catalog", condition: "Generated catalog or route manifest bytes differ from committed output.", rationale: "CI must fail when generated facts are stale." },
  { id: "classification.destructive-query-forbidden", phase: "registration", target: "descriptor", condition: "A query declares destructive operation risk.", rationale: "Destructive work belongs in an explicitly mutating command or durable job." },
  { id: "descriptor.handler-in-public-metadata", phase: "registration", target: "descriptor", condition: "A public descriptor object contains a handler or direct invocation field.", rationale: "Bindings must be unable to bypass executor stages." },
  { id: "descriptor.input-not-zod", phase: "registration", target: "descriptor", condition: "Descriptor input is absent, unresolved, or not a genuine Zod schema.", rationale: "External input requires runtime validation." },
  { id: "descriptor.output-not-zod", phase: "registration", target: "descriptor", condition: "Descriptor output is absent, unresolved, or not a genuine Zod schema.", rationale: "Handler output requires runtime validation." },
  { id: "descriptor.unknown-public-field", phase: "registration", target: "descriptor", condition: "Descriptor metadata contains an unknown or transport-specific field.", rationale: "Strict metadata prevents accidental transport or provider coupling." },
  { id: "errors.details-projection-required", phase: "execution", target: "context", condition: "Normalized error details are produced without the declared matching registered details projection.", rationale: "Structured error details require exact reviewed projection validation." },
  { id: "errors.duplicate-code", phase: "registration", target: "descriptor", condition: "A descriptor declares the same stable platform error code more than once.", rationale: "Error mapping must be deterministic." },
  { id: "errors.undeclared-mapping", phase: "registration", target: "descriptor", condition: "A transport mapping exists for an error not declared by the capability.", rationale: "Bindings may expose only reviewed safe errors." },
  { id: "errors.unsafe-details", phase: "execution", target: "context", condition: "Normalized error details contain provider payloads, credentials, stack traces, SQL, or sensitive keys.", rationale: "Platform errors must be safe at every transport boundary." },
  { id: "idempotency.global-tenant-mismatch", phase: "registration", target: "descriptor", condition: "A global capability requests tenant-capability key scope, or a tenant capability requests global-capability scope.", rationale: "Keys must be namespaced by the actual trusted scope." },
  { id: "idempotency.invalid-retention", phase: "registration", target: "descriptor", condition: "Required idempotency has non-positive or unsupported retention.", rationale: "Durable replay requires a bounded positive retention period." },
  { id: "idempotency.query-forbidden", phase: "registration", target: "descriptor", condition: "A query declares mutation idempotency ownership.", rationale: "Queries are read-only and cannot settle mutation receipts." },
  { id: "idempotency.raw-key-storage-forbidden", phase: "execution", target: "context", condition: "An adapter receives or persists the caller's raw idempotency key instead of its SHA-256 fingerprint.", rationale: "Raw caller keys may contain sensitive or identifying data." },
  { id: "idempotency.retryable-mutation-required", phase: "registration", target: "descriptor", condition: "A retryable command or job declares idempotency mode none.", rationale: "Retries require atomic ownership and deterministic replay or conflict." },
  { id: "observability.invalid-timeout", phase: "registration", target: "descriptor", condition: "Timeout is missing, non-positive, or above the supported maximum.", rationale: "Every execution needs bounded runtime behavior." },
  { id: "observability.projection-mismatch", phase: "execution", target: "context", condition: "Log or span attributes do not match the descriptor-declared registered attribute projection.", rationale: "Observability metadata must use its exact reviewed projection contract." },
  { id: "registry.descriptor-outside-ownership-root", phase: "registration", target: "registry", condition: "A descriptor is registered from outside an approved owning package or module root.", rationale: "Catalog ownership must be explicit and enforceable." },
  { id: "registry.duplicate-capability-id", phase: "registration", target: "registry", condition: "Two registrations use the same globally stable capability ID.", rationale: "Executor lookup must resolve to exactly one capability." },
  { id: "registry.unresolvable-schema", phase: "registration", target: "registry", condition: "Input, output, idempotency-key, authorization, audit, error-details, observability, or resource-reference schema or projection identity is unresolved or differs from its registered computed identity.", rationale: "Registration requires every executable contract and projection to resolve to its exact computed identity." },
  { id: "tenancy.client-selected-tenant-forbidden", phase: "execution", target: "context", condition: "A tenant or school identifier from capability input is treated as authority.", rationale: "Tenant identity must come from trusted server-side state or owner lookup." },
  { id: "tenancy.global-policy-required", phase: "registration", target: "descriptor", condition: "Global tenancy omits an explicit registered global policy.", rationale: "Unscoped access must be intentional and reviewable." },
  { id: "tenancy.referential-owner-policy-required", phase: "registration", target: "descriptor", condition: "Referential tenancy omits its trusted resolver or owner-scope policy.", rationale: "Referential tables require a verified owner-FK scope chain." },
  { id: "tenancy.school-resolver-required", phase: "registration", target: "descriptor", condition: "School tenancy omits a trusted tenant resolver.", rationale: "School context cannot be inferred from frontend input." },
  { id: "transaction.command-declaration-required", phase: "registration", target: "descriptor", condition: "A command omits its explicit none, required, or configured transaction declaration.", rationale: "Mutation boundaries must be intentional." },
  { id: "transaction.network-adapter-undocumented", phase: "execution", target: "context", condition: "A network-effect adapter is resolved inside a transaction without the declared protocol reference.", rationale: "External calls must not be held in database transactions accidentally." },
  { id: "transaction.query-must-be-none", phase: "registration", target: "descriptor", condition: "A query declares a required or explicit mutation transaction.", rationale: "Query descriptors are read-only by contract." },
] as const satisfies readonly InvalidCombinationRule[];
