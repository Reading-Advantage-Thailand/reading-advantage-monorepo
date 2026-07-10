import { describe, expect, it } from 'vitest';

import {
  evaluateDomainUtility,
  type DomainUtilityProvider,
} from '../planner/domain-utility.js';

const CONTEXT = {
  learnerId: 'learner-v32',
  domain: 'synthetic.v32',
  graphRelease: 'synthetic.v32.1',
};

describe('kst-srs.v3.2 §10.3 Domain Utility Provider', () => {
  it('uses an inert, deterministic score when no provider is registered', () => {
    expect(evaluateDomainUtility(undefined, 'node-a', CONTEXT)).toEqual({
      utility: 0,
      providerKey: null,
      providerVersion: null,
      signals: [],
    });
  });

  it('preserves provider and signal provenance exactly', () => {
    const provider: DomainUtilityProvider<typeof CONTEXT> = {
      providerKey: 'synthetic.frequency-utility',
      version: 'frequency.v2',
      getUtility(nodeId, ctx) {
        expect(nodeId).toBe('node-a');
        expect(ctx).toEqual(CONTEXT);
        return {
          utility: 0.8,
          signals: [
            { source: 'synthetic-frequency', sourceVersion: 'corpus.v4', value: 8, weight: 0.75 },
            { source: 'goal-coverage', sourceVersion: 'goals.v3', value: 0.2, weight: 0.25 },
          ],
        };
      },
    };

    const first = evaluateDomainUtility(provider, 'node-a', CONTEXT);
    const second = evaluateDomainUtility(provider, 'node-a', CONTEXT);
    expect(second).toEqual(first);
    expect(first).toEqual({
      utility: 0.8,
      providerKey: 'synthetic.frequency-utility',
      providerVersion: 'frequency.v2',
      signals: [
        { source: 'synthetic-frequency', sourceVersion: 'corpus.v4', value: 8, weight: 0.75 },
        { source: 'goal-coverage', sourceVersion: 'goals.v3', value: 0.2, weight: 0.25 },
      ],
    });
  });

  it('rejects missing provenance and out-of-range utility', () => {
    const missingVersion: DomainUtilityProvider<typeof CONTEXT> = {
      providerKey: 'synthetic.invalid',
      version: 'provider.v1',
      getUtility: () => ({
        utility: 0.5,
        signals: [{ source: 'corpus', sourceVersion: '', value: 1, weight: 1 }],
      }),
    };
    const outOfRange: DomainUtilityProvider<typeof CONTEXT> = {
      providerKey: 'synthetic.invalid',
      version: 'provider.v1',
      getUtility: () => ({
        utility: 1.01,
        signals: [{ source: 'corpus', sourceVersion: 'v1', value: 1, weight: 1 }],
      }),
    };

    expect(() => evaluateDomainUtility(missingVersion, 'node-a', CONTEXT)).toThrow(
      /sourceVersion|provenance/i,
    );
    expect(() => evaluateDomainUtility(outOfRange, 'node-a', CONTEXT)).toThrow(/utility|0.*1/i);
  });
});
