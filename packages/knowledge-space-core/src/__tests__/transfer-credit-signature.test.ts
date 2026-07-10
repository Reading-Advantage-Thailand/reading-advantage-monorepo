import { describe, it, expect } from 'vitest';
import {
  resolveEquivalenceComponent,
  aggregateComponentMastery,
  computeTransferCredit,
  batchComputeTransferCredit,
  TRANSFER_POLICY_DEFAULT,
  transferPolicySchema,
} from '../transfer-credit.js';
import type {
  TransferPolicy,
  ComponentMasteryResult,
} from '../transfer-credit.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Exported-surface contract
// ---------------------------------------------------------------------------

describe('transfer-credit exported surface', () => {
  it('exports resolveEquivalenceComponent as a function', () => {
    expect(typeof resolveEquivalenceComponent).toBe('function');
  });

  it('exports aggregateComponentMastery as a function', () => {
    expect(typeof aggregateComponentMastery).toBe('function');
  });

  it('exports computeTransferCredit as a function', () => {
    expect(typeof computeTransferCredit).toBe('function');
  });

  it('exports batchComputeTransferCredit as a function', () => {
    expect(typeof batchComputeTransferCredit).toBe('function');
  });

  it('exports a frozen TRANSFER_POLICY_DEFAULT', () => {
    expect(Object.isFrozen(TRANSFER_POLICY_DEFAULT)).toBe(true);
  });

  it('exports a usable transferPolicySchema', () => {
    expect(transferPolicySchema).toBeDefined();
    expect(typeof transferPolicySchema.parse).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Boundary — source imports
// ---------------------------------------------------------------------------

describe('transfer-credit boundary', () => {
  const sourcePath = resolve(__dirname, '../transfer-credit.ts');

  it('uses type-only imports from ./mastery-state', () => {
    const content = readFileSync(sourcePath, 'utf-8');
    expect(content).toMatch(/import\s+type\s+\{[^}]*KnowledgeStateEntry[^}]*\}\s+from\s+['"]\.\/mastery-state['"]/);
  });

  it('uses type-only imports from ./cross-course-equivalence', () => {
    const content = readFileSync(sourcePath, 'utf-8');
    expect(content).toMatch(/import\s+type\s+\{[^}]*EquivalenceComponent[^}]*\}\s+from\s+['"]\.\/cross-course-equivalence['"]/);
  });

  it('does not import from apps/, convex/_generated/, math-content, curriculum, or srs-engine', () => {
    const content = readFileSync(sourcePath, 'utf-8');
    const forbidden = [
      /from\s+['"]apps\//,
      /from\s+['"]\.\.\/\.\.\/apps\//,
      /from\s+['"]convex\/_generated/,
      /from\s+['"]@math-platform\/math-content/,
      /from\s+['"]packages\/math-content/,
      /from\s+['"]\.\.\/math-content/,
      /from\s+['"]curriculum\//,
      /from\s+['"]packages\/srs-engine/,
      /from\s+['"]@math-platform\/srs-engine/,
    ];
    for (const pattern of forbidden) {
      expect(pattern.test(content)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Compile-time type assertions
// ---------------------------------------------------------------------------

function _typeChecks() {
  const _policy: TransferPolicy = TRANSFER_POLICY_DEFAULT;
  const _componentMastery: ComponentMasteryResult | undefined = undefined;
  void _policy;
  void _componentMastery;
}
void _typeChecks;
