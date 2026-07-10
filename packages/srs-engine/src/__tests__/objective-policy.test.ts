import { describe, it, expect } from 'vitest';
import {
  objectivePolicySchema,
  objectivePrioritySchema,
  type ObjectivePolicyInput,
} from '../srs/objective-policy.js';

describe('objectivePrioritySchema', () => {
  it('accepts essential', () => {
    expect(objectivePrioritySchema.parse('essential')).toBe('essential');
  });

  it('accepts supporting', () => {
    expect(objectivePrioritySchema.parse('supporting')).toBe('supporting');
  });

  it('accepts extension', () => {
    expect(objectivePrioritySchema.parse('extension')).toBe('extension');
  });

  it('accepts triaged', () => {
    expect(objectivePrioritySchema.parse('triaged')).toBe('triaged');
  });

  it('rejects invalid priority', () => {
    expect(() => objectivePrioritySchema.parse('critical')).toThrow();
  });
});

describe('objectivePolicySchema', () => {
  function makeValidInput(): ObjectivePolicyInput {
    return {
      standardId: 'std-001',
      policy: 'essential',
      courseKey: 'integrated-math-3',
      priority: 10,
    };
  }

  it('passes with valid data', () => {
    const input = makeValidInput();
    const result = objectivePolicySchema.parse(input);
    expect(result.standardId).toBe('std-001');
    expect(result.policy).toBe('essential');
    expect(result.courseKey).toBe('integrated-math-3');
    expect(result.priority).toBe(10);
  });

  it('rejects empty standardId', () => {
    const input = { ...makeValidInput(), standardId: '' };
    expect(() => objectivePolicySchema.parse(input)).toThrow();
  });

  it('rejects invalid policy value', () => {
    const input = { ...makeValidInput(), policy: 'urgent' as const };
    expect(() => objectivePolicySchema.parse(input)).toThrow();
  });

  it('rejects empty courseKey', () => {
    const input = { ...makeValidInput(), courseKey: '   ' };
    expect(() => objectivePolicySchema.parse(input)).toThrow();
  });

  it('accepts zero priority', () => {
    const input = { ...makeValidInput(), priority: 0 };
    const result = objectivePolicySchema.parse(input);
    expect(result.priority).toBe(0);
  });

  it('accepts negative priority', () => {
    const input = { ...makeValidInput(), priority: -5 };
    const result = objectivePolicySchema.parse(input);
    expect(result.priority).toBe(-5);
  });

  it('rejects non-integer priority', () => {
    const input = { ...makeValidInput(), priority: 1.5 };
    expect(() => objectivePolicySchema.parse(input)).toThrow();
  });

  it('rejects missing required fields', () => {
    const input = { standardId: 'std-001' };
    expect(() => objectivePolicySchema.parse(input)).toThrow();
  });
});
