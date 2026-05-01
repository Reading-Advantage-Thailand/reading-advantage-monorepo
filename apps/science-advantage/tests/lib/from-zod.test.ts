import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildFormFields } from '@/lib/forms/from-zod';

describe('buildFormFields', () => {
  const baseSchema = z.object({
    name: z.string().min(1),
    description: z.string().max(200),
    gradeLevel: z.number().int().min(3).max(6),
    standardsAlignment: z.enum(['THAI', 'NGSS']),
    optionalField: z.string().optional(),
  });

  it('returns fields with sensible defaults derived from schema', () => {
    const fields = buildFormFields({
      schema: baseSchema,
    });

    expect(fields).toHaveLength(5);

    const nameField = fields.find(field => field.name === 'name');
    expect(nameField).toBeDefined();
    expect(nameField?.label).toBe('Name');
    expect(nameField?.type).toBe('text');
    expect(nameField?.required).toBe(true);

    const optionalField = fields.find(field => field.name === 'optionalField');
    expect(optionalField?.required).toBe(false);
  });

  it('automatically infers select options for enums', () => {
    const fields = buildFormFields({
      schema: baseSchema,
    });

    const enumField = fields.find(field => field.name === 'standardsAlignment');
    expect(enumField?.type).toBe('select');
    expect(enumField?.options).toEqual([
      { label: 'THAI', value: 'THAI' },
      { label: 'NGSS', value: 'NGSS' },
    ]);
  });

  it('respects override metadata including ordering and visibility', () => {
    const fields = buildFormFields({
      schema: baseSchema,
      overrides: {
        optionalField: {
          hidden: true,
        },
        gradeLevel: {
          type: 'select',
          options: [
            { label: 'Grade 3', value: 3 },
            { label: 'Grade 4', value: 4 },
          ],
          order: 1,
        },
        name: {
          order: 0,
        },
      },
    });

    expect(fields.some(field => field.name === 'optionalField')).toBe(false);
    expect(fields[0]?.name).toBe('name');
    expect(fields[1]?.name).toBe('gradeLevel');
    expect(fields[1]?.options).toEqual([
      { label: 'Grade 3', value: 3 },
      { label: 'Grade 4', value: 4 },
    ]);
  });

  it('renders textarea when max length exceeds threshold', () => {
    const schema = z.object({
      details: z.string().max(500),
    });

    const fields = buildFormFields({
      schema,
    });

    expect(fields[0]?.type).toBe('textarea');
  });
});
