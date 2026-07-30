import type { AssetContractV2SemanticRegistration } from "./semantic-product-bindings.js";

/** Resolver-issued registrations recognized by the descriptor-driven adapter. */
const issuedSemanticRegistrations = new WeakSet<object>();

function deepFreezeResolverValue<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (typeof value !== "object" || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    deepFreezeResolverValue((value as Record<PropertyKey, unknown>)[key], seen);
  }
  return Object.freeze(value);
}

/**
 * Marks a registration as having been issued by the descriptor-aware resolver.
 * @param registration The resolver-created registration to authorize for adapter consumption.
 * @returns The same immutable registration with internal provenance recorded.
 */
export function issueAssetContractV2SemanticRegistration(
  registration: AssetContractV2SemanticRegistration,
): AssetContractV2SemanticRegistration {
  const immutableRegistration = deepFreezeResolverValue(registration);
  issuedSemanticRegistrations.add(immutableRegistration);
  return immutableRegistration;
}

/**
 * Checks whether a registration was issued by the descriptor-aware resolver.
 * @param candidate The value offered to a descriptor-driven adapter.
 * @returns Whether the value is the exact resolver-issued registration object.
 */
export function isIssuedAssetContractV2SemanticRegistration(
  candidate: unknown,
): candidate is AssetContractV2SemanticRegistration {
  return typeof candidate === "object" && candidate !== null && issuedSemanticRegistrations.has(candidate);
}
