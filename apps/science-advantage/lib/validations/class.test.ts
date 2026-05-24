import { describe, expect, it } from 'vitest';

import {
  createClassSchema,
  joinClassSchema,
  updateClassSchema,
} from './class';

describe('createClassSchema (extra coverage)', () => {
  it('rejects names shorter than 3 characters', () => {
    expect(() =>
      createClassSchema.parse({
        name: 'AB',
        gradeLevel: 4,
        standardsAlignment: 'NGSS',
      })
    ).toThrow();
  });

  it('rejects names longer than 100 characters', () => {
    expect(() =>
      createClassSchema.parse({
        name: 'x'.repeat(101),
        gradeLevel: 4,
        standardsAlignment: 'NGSS',
      })
    ).toThrow();
  });

  it('rejects gradeLevel below 3 or above 6', () => {
    for (const grade of [2, 7]) {
      expect(() =>
        createClassSchema.parse({
          name: 'Valid',
          gradeLevel: grade,
          standardsAlignment: 'NGSS',
        })
      ).toThrow();
    }
  });

  it('rejects an unknown standardsAlignment value', () => {
    expect(() =>
      createClassSchema.parse({
        name: 'Valid',
        gradeLevel: 4,
        standardsAlignment: 'COMMON_CORE',
      })
    ).toThrow();
  });

  it('rejects when required fields are missing', () => {
    expect(() =>
      createClassSchema.parse({ name: 'Valid', gradeLevel: 4 })
    ).toThrow();
  });
});

describe('updateClassSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(updateClassSchema.parse({})).toEqual({});
  });

  it('still enforces constraints on provided fields', () => {
    expect(() => updateClassSchema.parse({ gradeLevel: 10 })).toThrow();
    expect(() =>
      updateClassSchema.parse({ standardsAlignment: 'OTHER' })
    ).toThrow();
  });
});

describe('joinClassSchema', () => {
  it('trims and uppercases a valid join code', () => {
    const result = joinClassSchema.parse({ joinCode: ' abc234 ' });
    expect(result.joinCode).toBe('ABC234');
  });

  it('rejects a malformed join code', () => {
    expect(() => joinClassSchema.parse({ joinCode: 'too-short' })).toThrow();
  });

  it('rejects a missing join code', () => {
    expect(() => joinClassSchema.parse({})).toThrow();
  });
});
