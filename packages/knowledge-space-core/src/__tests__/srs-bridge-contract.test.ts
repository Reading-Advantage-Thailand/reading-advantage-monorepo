import { describe, it, expect } from 'vitest';
import { getKnowledgeState } from '../index.js';
import type {
  SrsToKstBridge,
  SrsBridgeInput,
  LearnerStateOutput,
} from '../index.js';

// ---------------------------------------------------------------------------
// Phase 1 — SRS → KST bridge contract (Red)
// ---------------------------------------------------------------------------

function expectType<T>(_value: T) {
  // compile-time type assertion only
}

describe('srs-bridge contract', () => {
  it('exports the SrsToKstBridge interface as a type', () => {
    // Cross-module anchor: the bridge contract is meaningful only once the
    // knowledge-state engine signature exists.
    expect(typeof getKnowledgeState).toBe('function');

    const stub: SrsToKstBridge = {
      buildLearnerState: (_input: SrsBridgeInput, _now: number) => ({
        evidence: [],
      } as LearnerStateOutput),
    };
    expect(stub).toBeDefined();
    expect(typeof stub.buildLearnerState).toBe('function');
  });

  it('SrsBridgeInput contains cards and proficiencyResults fields', () => {
    expect(typeof getKnowledgeState).toBe('function');
    type Keys = keyof SrsBridgeInput;
    const requiredKeys: Keys[] = ['cards', 'proficiencyResults'];
    expect(requiredKeys).toContain('cards');
    expect(requiredKeys).toContain('proficiencyResults');
  });

  it('LearnerStateOutput is structurally compatible with getKnowledgeState input', () => {
    expect(typeof getKnowledgeState).toBe('function');
    type EvidenceArg = Parameters<typeof getKnowledgeState>[1];
    type _OutputHasEvidence = LearnerStateOutput extends { evidence: EvidenceArg }
      ? true
      : never;
    expectType<_OutputHasEvidence>(true);
  });

  it('does not export a concrete buildLearnerState function', async () => {
    const module = await import('../srs-bridge.js');
    expect(module).not.toHaveProperty('buildLearnerState');
  });
});
