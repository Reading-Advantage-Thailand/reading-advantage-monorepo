import { describe, expect, it } from 'vitest';

import {
  createClassFormSchema,
  createClassSchema,
  updateClassSchema,
} from '@/lib/validations/class';

describe('class validation schemas', () => {
  it('validates createClassSchema with valid payload', () => {
    const data = createClassSchema.parse({
      name: 'Science Explorers',
      gradeLevel: 4,
      standardsAlignment: 'NGSS',
    });

    expect(data).toEqual({
      name: 'Science Explorers',
      gradeLevel: 4,
      standardsAlignment: 'NGSS',
    });
  });

  it('coerces createClassFormSchema inputs from strings', () => {
    const result = createClassFormSchema.parse({
      name: '  Biology Basics  ',
      gradeLevel: '5',
      standardsAlignment: 'THAI',
    });

    expect(result).toEqual({
      name: 'Biology Basics',
      gradeLevel: 5,
      standardsAlignment: 'THAI',
    });
  });

  it('rejects invalid grade levels in createClassFormSchema', () => {
    expect(() =>
      createClassFormSchema.parse({
        name: 'Invalid Grade',
        gradeLevel: '2',
        standardsAlignment: 'THAI',
      })
    ).toThrow();
  });

  it('allows partial payloads for updateClassSchema', () => {
    const data = updateClassSchema.parse({
      name: 'Updated Name',
    });

    expect(data).toEqual({
      name: 'Updated Name',
    });
  });
});
