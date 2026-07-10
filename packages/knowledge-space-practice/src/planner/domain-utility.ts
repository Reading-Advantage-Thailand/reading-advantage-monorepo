import { z } from 'zod';

/** Provenance for one signal contributing to a domain utility score. */
export interface UtilitySignal {
  source: string;
  sourceVersion: string;
  value: number;
  weight: number;
}

/** Provider-owned utility output before the engine adds provider provenance. */
export interface DomainUtilityValue {
  utility: number;
  signals: UtilitySignal[];
}

/** Deterministic, versioned utility provider registered by a domain adapter. */
export interface DomainUtilityProvider<Context = unknown> {
  providerKey: string;
  version: string;
  getUtility(nodeId: string, context: Context): DomainUtilityValue;
}

/** Validated utility result consumed by the domain-neutral planner. */
export interface EvaluatedDomainUtility extends DomainUtilityValue {
  providerKey: string | null;
  providerVersion: string | null;
}

const utilitySignalSchema = z.strictObject({
  source: z.string().trim().min(1),
  sourceVersion: z.string().trim().min(1),
  value: z.number().finite(),
  weight: z.number().finite().min(0),
});

const providerSchema = z.strictObject({
  providerKey: z.string().trim().min(1),
  version: z.string().trim().min(1),
});

const utilityValueSchema = z.strictObject({
  utility: z.number().finite().min(0).max(1),
  signals: z.array(utilitySignalSchema).min(1),
});

/**
 * Evaluates and validates one injected domain utility provider result.
 * @param provider Registered provider, or undefined when a domain has none.
 * @param nodeId Candidate node identifier.
 * @param context Deterministic learner context supplied by the caller.
 * @returns Validated scalar utility with complete provider and signal provenance.
 * @throws When provider identity, score range, or signal provenance is invalid.
 */
export function evaluateDomainUtility<Context>(
  provider: DomainUtilityProvider<Context> | undefined,
  nodeId: string,
  context: Context,
): EvaluatedDomainUtility {
  if (!provider) {
    return {
      utility: 0,
      providerKey: null,
      providerVersion: null,
      signals: [],
    };
  }

  const identity = providerSchema.parse({
    providerKey: provider.providerKey,
    version: provider.version,
  });
  const value = utilityValueSchema.parse(provider.getUtility(nodeId, context));
  return {
    utility: value.utility,
    providerKey: identity.providerKey,
    providerVersion: identity.version,
    signals: value.signals,
  };
}
